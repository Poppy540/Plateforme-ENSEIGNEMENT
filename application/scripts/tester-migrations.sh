#!/usr/bin/env bash
# Essai des migrations suivies (Jalon 12, étape 1 ; ADR 0075) sur un Postgres local jetable : base neuve, base à
# jour, base en retard, base migrée à la main, fichier modifié, migration en échec. Usage : `pnpm test:migrations`.
set -euo pipefail

racine="$(cd "$(dirname "$0")/.." && pwd)"
bin="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$bin/initdb" ] || bin="$(dirname "$(command -v initdb)")"
dossier="$(mktemp -d)"
port="${PG_PORT_MIGRATIONS:-54333}"
executer() { if [ "$(id -u)" = "0" ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
nettoyer() { executer "'$bin/pg_ctl' -D '$dossier/donnees' -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$dossier"; }
trap nettoyer EXIT
[ "$(id -u)" = "0" ] && chown postgres "$dossier"
executer "'$bin/initdb' -D '$dossier/donnees' -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null"
executer "'$bin/pg_ctl' -D '$dossier/donnees' -o '-p $port -k $dossier -c listen_addresses=' -l '$dossier/journal' -w start >/dev/null"

url() { echo "postgresql://postgres@/$1?host=$dossier&port=$port"; }
nouvelle_base() {
  psql --dbname="$(url postgres)" -X -q -c "create database $1" >/dev/null
  # Rôles déjà créés dans ce serveur (erreurs ignorées) : seul le schéma auth de cette base compte.
  psql --dbname="$(url "$1")" -X -q -f "$racine/supabase/tests/00_simulation_supabase.sql" > /dev/null 2>&1
}
migrer() { # base dossier [options…]
  local base="$1" migrations="$2"; shift 2
  URL_BASE_DONNEES_ADMIN="$(url "$base")" DOSSIER_MIGRATIONS="$migrations" \
    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON "$racine/scripts/migrer.mts" "$@"
}
echec() { echo "ÉCHEC : $*" >&2; exit 1; }
total=$(ls "$racine"/supabase/migrations/*.sql | wc -l)
derniere=$(ls "$racine"/supabase/migrations/*.sql | sort | tail -1 | xargs basename)

# M01 Base neuve : simulation sans effet, puis tout est appliqué ; second passage : rien.
nouvelle_base neuve
migrer neuve "$racine/supabase/migrations" --simuler | grep -q "À appliquer ($total)" || echec "M01 simulation"
[ "$(psql --dbname="$(url neuve)" -X -At -c "select to_regclass('public.migrations_appliquees') is null")" = "t" ] \
  || echec "M01 la simulation a écrit"
migrer neuve "$racine/supabase/migrations" | grep -q "$total migration(s) appliquée(s)" || echec "M01 application"
migrer neuve "$racine/supabase/migrations" | grep -q "Base à jour ($total" || echec "M01 second passage"
echo "OK M01 base neuve : simulation sans effet, $total migrations appliquées, second passage sans effet"

# M02 Base en retard d'une migration.
partiel="$dossier/partiel"; mkdir "$partiel"; cp "$racine"/supabase/migrations/*.sql "$partiel"/; rm "$partiel/$derniere"
nouvelle_base retard
migrer retard "$partiel" > /dev/null
migrer retard "$racine/supabase/migrations" | grep -q "Appliquée : $derniere" || echec "M02 migration manquante"
echo "OK M02 base en retard : seule la migration manquante est appliquée"

# M03 Fichier déjà appliqué puis modifié : refus, rien n'est fait.
modifie="$dossier/modifie"; mkdir "$modifie"; cp "$racine"/supabase/migrations/*.sql "$modifie"/
echo "-- modification" >> "$modifie/$derniere"
if migrer neuve "$modifie" 2>/dev/null; then echec "M03 fichier modifié accepté"; fi
echo "OK M03 migration déjà appliquée puis modifiée : refusée"

# M04 Migration en échec : annulée, non notée ; la base reste utilisable.
casse="$dossier/casse"; mkdir "$casse"; cp "$racine"/supabase/migrations/*.sql "$casse"/
printf 'create table essai_migration (id int);\nselect 1 / 0;\n' > "$casse/29991231000000_essai_en_echec.sql"
if migrer neuve "$casse" 2>/dev/null; then echec "M04 migration en échec acceptée"; fi
[ "$(psql --dbname="$(url neuve)" -X -At -c "select to_regclass('public.essai_migration') is null and not exists (select 1 from migrations_appliquees where nom like '2999%')")" = "t" ] \
  || echec "M04 traces d'une migration en échec"
echo "OK M04 migration en échec : annulée entièrement, non notée"

# M05 Base migrée à la main avant l'outil : refus, puis reprise avec --marquer-jusqu-a.
nouvelle_base manuelle
for m in "$racine"/supabase/migrations/*.sql; do psql --dbname="$(url manuelle)" -X -q -v ON_ERROR_STOP=1 -f "$m" > /dev/null 2>&1; done
if migrer manuelle "$racine/supabase/migrations" 2>/dev/null; then echec "M05 base non suivie migrée"; fi
migrer manuelle "$racine/supabase/migrations" --marquer-jusqu-a "$derniere" | grep -q "Base à jour" || echec "M05 reprise"
echo "OK M05 base migrée à la main : refusée, puis reprise après vérification (--marquer-jusqu-a)"

# M06 Aucun accès des rôles applicatifs au suivi.
psql --dbname="$(url neuve)" -X -q -v ON_ERROR_STOP=1 <<'SQL' > /dev/null
set role authenticated;
do $$ begin
  begin perform 1 from migrations_appliquees; raise exception 'M06 : suivi lisible';
  exception when insufficient_privilege then null; end;
end $$;
SQL
echo "OK M06 suivi des migrations illisible pour les rôles de l'application"
echo "MIGRATIONS SUIVIES : TOUS LES ESSAIS SONT PASSÉS"
