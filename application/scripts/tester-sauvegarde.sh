#!/usr/bin/env bash
# Essai complet de sauvegarde et de restauration (Jalon 11, étape 3 ; ADR 0072), sur deux Postgres locaux jetables
# et des données FICTIVES : base d'origine (migrations, packs, données de test), sauvegarde, restauration dans un
# second serveur vide (rôles compris), puis vérifications : nombres de lignes, règles d'accès, droits des agents,
# refus d'écraser une base non vide. Usage : depuis application/, `pnpm test:sauvegarde`.
set -euo pipefail

racine="$(cd "$(dirname "$0")/.." && pwd)"
bin="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$bin/initdb" ] || bin="$(dirname "$(command -v initdb)")"
dossier="$(mktemp -d)"
port_origine="${PG_PORT_ORIGINE:-54331}"
port_cible="${PG_PORT_CIBLE:-54332}"

executer() { if [ "$(id -u)" = "0" ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
nettoyer() {
  for d in origine cible; do executer "'$bin/pg_ctl' -D '$dossier/$d' -m immediate stop" >/dev/null 2>&1 || true; done
  rm -rf "$dossier"
}
trap nettoyer EXIT
[ "$(id -u)" = "0" ] && chown postgres "$dossier"

demarrer() { # nom port
  executer "'$bin/initdb' -D '$dossier/$1' -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null"
  executer "'$bin/pg_ctl' -D '$dossier/$1' -o '-p $2 -k $dossier -c listen_addresses=' -l '$dossier/$1.journal' -w start >/dev/null"
}
demarrer origine "$port_origine"
demarrer cible "$port_cible"
origine="postgresql://postgres@/postgres?host=$dossier&port=$port_origine"
cible="postgresql://postgres@/postgres?host=$dossier&port=$port_cible"
psql_origine() { psql --dbname="$origine" -X -q -v ON_ERROR_STOP=1 "$@"; }
psql_cible() { psql --dbname="$cible" -X -q -v ON_ERROR_STOP=1 "$@"; }

# 1. Base d'origine : comme en production (migrations, pack pilote), plus des données fictives.
psql_origine -f "$racine/supabase/tests/00_simulation_supabase.sql"
URL_BASE_DONNEES_ADMIN="$origine" DOSSIER_MIGRATIONS="$racine/supabase/migrations" \
  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON "$racine/scripts/migrer.mts" > /dev/null
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON "$racine/scripts/pack-en-sql.mts" "$racine/../referentiels/gabon" \
  | psql_origine -o /dev/null
psql_origine -f "$racine/supabase/tests/10_donnees_fictives.sql" -o /dev/null

# 2. Sauvegarde.
URL_BASE_DONNEES_ADMIN="$origine" bash "$racine/scripts/sauvegarde-base.sh" sauvegarder "$dossier/sauvegardes"
sauvegarde="$(ls -d "$dossier"/sauvegardes/sauvegarde-*)"
grep -q "password\|PASSWORD" "$sauvegarde/roles.sql" && { echo "ÉCHEC : mot de passe dans roles.sql" >&2; exit 1; }

# 3. Garde-fous : sans --confirmer, ou vers une base non vide, rien n'est fait.
if URL_BASE_DONNEES_CIBLE="$cible" bash "$racine/scripts/sauvegarde-base.sh" restaurer "$sauvegarde" 2>/dev/null; then
  echo "ÉCHEC : restauration lancée sans --confirmer" >&2; exit 1
fi
if URL_BASE_DONNEES_CIBLE="$origine" bash "$racine/scripts/sauvegarde-base.sh" restaurer "$sauvegarde" --confirmer 2>/dev/null; then
  echo "ÉCHEC : base non vide écrasée" >&2; exit 1
fi
echo "OK S01 restauration refusée sans --confirmer et vers une base non vide"

# 4. Restauration dans le second serveur, vide (aucun rôle de la plateforme).
URL_BASE_DONNEES_CIBLE="$cible" bash "$racine/scripts/sauvegarde-base.sh" restaurer "$sauvegarde" --confirmer
echo "OK S02 restauration complète, mêmes nombres de lignes dans chaque table"

# 5. Règles d'accès et droits des agents restaurés : un élève ne voit que sa progression, un agent garde ses droits.
psql_cible -o /dev/null <<'SQL'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;
do $$ begin
  assert (select count(*) from progression) = 1, 'S03 : un élève voit la progression d''un autre';
  assert (select count(*) from eleves) = 1, 'S03 : un élève voit un autre élève';
end $$;
reset role;
set role anon;
do $$ begin
  begin perform 1 from progression; raise exception 'S03 : visiteur lit la progression';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role agent_professeur;
do $$ begin assert (select count(*) from chapitres) >= 0; end $$;
reset role;
do $$ begin
  assert exists (select 1 from pg_auth_members am join pg_roles r on r.oid = am.roleid join pg_roles m on m.oid = am.member
                 where r.rolname = 'agent_professeur' and m.rolname = 'serveur_application'), 'S03 : appartenance perdue';
  assert not (select rolcanlogin from pg_roles where rolname = 'serveur_application'), 'S03 : connexion sans mot de passe';
end $$;
SQL
echo "OK S03 règles d'accès, droits des agents et rôles restaurés ; aucun mot de passe copié"

# 6. Une sauvegarde altérée est refusée.
psql_cible -c "create database essai_vide" >/dev/null
printf 'x' >> "$sauvegarde/base.dump"
if URL_BASE_DONNEES_CIBLE="${cible/\/postgres?/\/essai_vide?}" bash "$racine/scripts/sauvegarde-base.sh" restaurer "$sauvegarde" --confirmer 2>/dev/null; then
  echo "ÉCHEC : sauvegarde altérée restaurée" >&2; exit 1
fi
echo "OK S04 sauvegarde altérée refusée (empreintes)"

# 7. Décision D12 (ADR 0093) : sauvegarde chiffrée avec age, jamais en clair sur le disque ; restauration avec la clé
#    privée seulement. Clé FICTIVE tirée pour cet essai, effacée avec le dossier.
if command -v age > /dev/null && command -v age-keygen > /dev/null; then
  age-keygen -o "$dossier/cle-essai.txt" 2> /dev/null
  destinataire="$(age-keygen -y "$dossier/cle-essai.txt")"
  SAUVEGARDE_DESTINATAIRE_AGE="$destinataire" URL_BASE_DONNEES_ADMIN="$origine" \
    bash "$racine/scripts/sauvegarde-base.sh" sauvegarder "$dossier/chiffrees" > /dev/null
  chiffree="$(ls -d "$dossier"/chiffrees/sauvegarde-*)"
  [ ! -e "$chiffree/base.dump" ] || { echo "ÉCHEC : copie en clair à côté de la copie chiffrée" >&2; exit 1; }
  head -c 21 "$chiffree/base.dump.age" | grep -q "age-encryption.org" \
    || { echo "ÉCHEC : base.dump.age n'est pas chiffrée par age" >&2; exit 1; }
  psql_cible -c "create database essai_chiffre" > /dev/null
  cible_chiffre="postgresql://postgres@/essai_chiffre?host=$dossier&port=$port_cible"
  if URL_BASE_DONNEES_CIBLE="$cible_chiffre" bash "$racine/scripts/sauvegarde-base.sh" restaurer "$chiffree" --confirmer 2>/dev/null; then
    echo "ÉCHEC : copie chiffrée restaurée sans clé privée" >&2; exit 1
  fi
  SAUVEGARDE_IDENTITE_AGE="$dossier/cle-essai.txt" URL_BASE_DONNEES_CIBLE="$cible_chiffre" \
    bash "$racine/scripts/sauvegarde-base.sh" restaurer "$chiffree" --confirmer > /dev/null
  echo "OK S05 sauvegarde chiffrée (age), refusée sans clé privée, restaurée avec elle"
else
  echo "ÉCHEC : l'outil age est requis pour l'essai du chiffrement (décision D12)" >&2; exit 1
fi

# 8. En production, une sauvegarde n'est jamais écrite en clair.
if ENVIRONNEMENT=production URL_BASE_DONNEES_ADMIN="$origine" \
  bash "$racine/scripts/sauvegarde-base.sh" sauvegarder "$dossier/production" 2>/dev/null; then
  echo "ÉCHEC : sauvegarde en clair acceptée en production" >&2; exit 1
fi
[ -z "$(ls -A "$dossier/production" 2>/dev/null)" ] || { echo "ÉCHEC : fichier laissé par une sauvegarde refusée" >&2; exit 1; }
echo "OK S06 en production, sauvegarde en clair refusée"
echo "ESSAI DE SAUVEGARDE ET DE RESTAURATION RÉUSSI"
