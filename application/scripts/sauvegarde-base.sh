#!/usr/bin/env bash
# Sauvegarde et restauration de la base (Jalon 11, étape 3 ; ADR 0072). Copie de secours INDÉPENDANTE de
# l'hébergeur, en plus de ses propres sauvegardes. Aucune adresse ni aucun mot de passe n'est affiché.
#
#   pnpm base:sauvegarder [dossier]
#       Connexion : URL_BASE_DONNEES_ADMIN. Crée <dossier>/sauvegarde-<date>/ avec :
#         base.dump.age copie complète (format personnalisé de pg_dump, compressée), CHIFFRÉE avec age pour la clé
#                       publique SAUVEGARDE_DESTINATAIRE_AGE (décision D12, ADR 0093) ; sans clé : base.dump en clair,
#                       refusé quand ENVIRONNEMENT=production
#         roles.sql     rôles et appartenances à recréer avant la restauration (sans aucun mot de passe)
#         controle.tsv  nombre de lignes de chaque table, pour vérifier la restauration
#         empreintes    SHA-256 des trois fichiers
#   pnpm base:restaurer <dossier de sauvegarde> --confirmer
#       Connexion : URL_BASE_DONNEES_CIBLE (jamais la base d'origine par défaut). Une copie chiffrée se déchiffre avec
#       le fichier de clé privée SAUVEGARDE_IDENTITE_AGE (gardé hors du serveur ; jamais affiché), dans un dossier
#       temporaire effacé ensuite. Refuse une base cible qui contient
#       déjà des tables : la restauration n'écrase jamais rien. Recrée les rôles, restaure, puis compare le nombre de
#       lignes de chaque table avec controle.tsv.
#
# La sauvegarde contient des données personnelles : chiffrée dès sa création (age), hors du dépôt, avec un accès
# limité au propriétaire ; la clé privée n'est jamais sur le serveur (voir docs/production/README.md §5).
set -euo pipefail

erreur() { echo "Erreur : $*" >&2; exit 2; }

compter_lignes() {
  # Une ligne « schéma.table<TAB>nombre » par table ordinaire, hors schémas du système.
  psql --dbname="$1" -X -q -At -v ON_ERROR_STOP=1 <<'SQL'
select format('select %L || chr(9) || count(*) from %I.%I', n.nspname || '.' || c.relname, n.nspname, c.relname)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p') and n.nspname not in ('pg_catalog', 'information_schema') and n.nspname !~ '^pg_'
order by 1
\gexec
SQL
}

sauvegarder() {
  local url="${URL_BASE_DONNEES_ADMIN:-}"
  [ -n "$url" ] || erreur "URL_BASE_DONNEES_ADMIN manquante."
  local racine="${1:-sauvegardes}"
  local dossier
  dossier="$racine/sauvegarde-$(date -u +%Y%m%d-%H%M%S)"
  mkdir -p "$dossier"
  chmod 700 "$racine" "$dossier"
  umask 077

  local destinataire="${SAUVEGARDE_DESTINATAIRE_AGE:-}"
  if [ -z "$destinataire" ] && [ "${ENVIRONNEMENT:-}" = "production" ]; then
    rmdir "$dossier" 2>/dev/null || true
    erreur "SAUVEGARDE_DESTINATAIRE_AGE manquante : en production, une sauvegarde n'est jamais écrite en clair (D12)."
  fi
  if [ -n "$destinataire" ]; then
    command -v age > /dev/null || erreur "l'outil age est introuvable (décision D12 : l'installer sur le serveur)."
    # Le dump ne touche jamais le disque en clair : il passe directement de pg_dump à age.
    pg_dump --dbname="$url" --format=custom --compress=6 --no-owner \
      | age --encrypt --recipient "$destinataire" --output "$dossier/base.dump.age"
  else
    echo "Attention : sauvegarde NON chiffrée (SAUVEGARDE_DESTINATAIRE_AGE absente ; acceptable hors production)." >&2
    pg_dump --dbname="$url" --format=custom --compress=6 --no-owner --file="$dossier/base.dump"
  fi

  # Rôles non système et leurs appartenances. Jamais de mot de passe : un rôle de connexion est recréé sans
  # connexion possible ; le propriétaire lui redonne un mot de passe après la restauration.
  psql --dbname="$url" -X -q -At -v ON_ERROR_STOP=1 > "$dossier/roles.sql" <<'SQL'
select format(
  'do $r$ begin if not exists (select 1 from pg_roles where rolname = %L) then create role %I nologin%s%s; end if; end $r$;',
  rolname, rolname, case when rolinherit then '' else ' noinherit' end, case when rolbypassrls then ' bypassrls' else '' end)
from pg_roles
where rolname !~ '^pg_' and not rolsuper and rolname <> current_user
order by rolname;
select format('grant %I to %I;', r.rolname, m.rolname)
from pg_auth_members am join pg_roles r on r.oid = am.roleid join pg_roles m on m.oid = am.member
where r.rolname !~ '^pg_' and m.rolname !~ '^pg_' and not m.rolsuper and m.rolname <> current_user
order by 1;
SQL

  compter_lignes "$url" > "$dossier/controle.tsv"
  local copie=base.dump
  [ -f "$dossier/base.dump.age" ] && copie=base.dump.age
  (cd "$dossier" && sha256sum "$copie" roles.sql controle.tsv > empreintes)
  echo "Sauvegarde écrite : $dossier/$copie ($(du -h "$dossier/$copie" | cut -f1), $(wc -l < "$dossier/controle.tsv") tables)."
}

restaurer() {
  local dossier="${1:-}"
  [ -n "$dossier" ] && { [ -f "$dossier/base.dump" ] || [ -f "$dossier/base.dump.age" ]; } \
    || erreur "dossier de sauvegarde attendu (avec base.dump ou base.dump.age)."
  [ "${2:-}" = "--confirmer" ] || erreur "ajoutez --confirmer pour restaurer (rien n'a été fait)."
  local url="${URL_BASE_DONNEES_CIBLE:-}"
  [ -n "$url" ] || erreur "URL_BASE_DONNEES_CIBLE manquante (la base où restaurer)."

  (cd "$dossier" && sha256sum --quiet -c empreintes) || erreur "fichiers de sauvegarde altérés (empreintes)."
  local tables
  tables=$(psql --dbname="$url" -X -q -At -c \
    "select count(*) from pg_tables where schemaname not in ('pg_catalog', 'information_schema')")
  [ "$tables" = "0" ] || erreur "la base cible contient déjà $tables table(s) : restauration refusée (rien n'est écrasé)."

  # Copie chiffrée : déchiffrée dans un dossier temporaire privé, effacé à la sortie quoi qu'il arrive.
  local dump="$dossier/base.dump" clair=""
  if [ -f "$dossier/base.dump.age" ]; then
    local identite="${SAUVEGARDE_IDENTITE_AGE:-}"
    [ -n "$identite" ] && [ -f "$identite" ] \
      || erreur "copie chiffrée : SAUVEGARDE_IDENTITE_AGE doit désigner le fichier de clé privée (rien n'a été fait)."
    command -v age > /dev/null || erreur "l'outil age est introuvable (rien n'a été fait)."
    clair=$(mktemp -d)
    chmod 700 "$clair"
    # Chemin figé dans le piège : la variable locale n'existe plus à la sortie du script.
    # shellcheck disable=SC2064
    trap "rm -rf '$clair'" EXIT
    age --decrypt --identity "$identite" --output "$clair/base.dump" "$dossier/base.dump.age" \
      || erreur "déchiffrement impossible : mauvaise clé privée ? (rien n'a été fait)."
    dump="$clair/base.dump"
  fi

  psql --dbname="$url" -X -q -v ON_ERROR_STOP=1 -f "$dossier/roles.sql" > /dev/null
  pg_restore --dbname="$url" --no-owner --exit-on-error "$dump"

  local apres
  apres=$(mktemp)
  compter_lignes "$url" > "$apres"
  if ! diff -q "$dossier/controle.tsv" "$apres" > /dev/null; then
    echo "Restauration INCOMPLÈTE : nombres de lignes différents :" >&2
    diff "$dossier/controle.tsv" "$apres" >&2 || true
    rm -f "$apres"
    exit 1
  fi
  rm -f "$apres"
  echo "Restauration vérifiée : $(wc -l < "$dossier/controle.tsv") tables, mêmes nombres de lignes."
  echo "À faire ensuite : redonner un mot de passe au rôle de connexion de l'application (serveur_application)."
}

case "${1:-}" in
  sauvegarder) shift; sauvegarder "$@" ;;
  restaurer) shift; restaurer "$@" ;;
  *) erreur "usage : sauvegarde-base.sh sauvegarder [dossier] | restaurer <dossier> --confirmer" ;;
esac
