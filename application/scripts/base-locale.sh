#!/usr/bin/env bash
# Base Postgres locale pour le développement et les tests de bout en bout (données fictives uniquement).
# Usage : scripts/base-locale.sh demarrer | arreter | reinitialiser
# Connexion de l'application : URL_BASE_DONNEES=postgresql://serveur_application@127.0.0.1:54330/postgres
set -euo pipefail

racine="$(cd "$(dirname "$0")/.." && pwd)"
bin="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$bin/initdb" ] || bin="$(dirname "$(command -v initdb)")"
dossier="$racine/.base-locale"
port="${PG_PORT_LOCAL:-54330}"

executer() { if [ "$(id -u)" = "0" ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
psql_admin() { psql -h 127.0.0.1 -p "$port" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

arreter() { [ -d "$dossier/donnees" ] && executer "'$bin/pg_ctl' -D '$dossier/donnees' -m fast stop" >/dev/null 2>&1 || true; }

demarrer() {
  if [ ! -d "$dossier/donnees" ]; then
    mkdir -p "$dossier"
    [ "$(id -u)" = "0" ] && chown postgres "$dossier"
    executer "'$bin/initdb' -D '$dossier/donnees' -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null"
    nouvelle=1
  fi
  if ! executer "'$bin/pg_ctl' -D '$dossier/donnees' status" >/dev/null 2>&1; then
    executer "'$bin/pg_ctl' -D '$dossier/donnees' -o '-p $port -c listen_addresses=127.0.0.1 -k $dossier' -l '$dossier/journal' -w start" >/dev/null
  fi
  if [ "${nouvelle:-0}" = "1" ]; then
    psql_admin -f "$racine/supabase/tests/00_simulation_supabase.sql"
    for migration in "$racine"/supabase/migrations/*.sql; do psql_admin -f "$migration"; done
    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON "$racine/scripts/pack-en-sql.mts" "$racine/../referentiels/gabon" | psql_admin -o /dev/null
    # Développement seulement : le serveur se connecte sans mot de passe et crée les comptes simulés.
    psql_admin -c "alter role serveur_application login; grant usage on schema auth to serveur_application; grant select, insert, delete on auth.users to serveur_application;"
  fi
  echo "Base locale prête : postgresql://serveur_application@127.0.0.1:$port/postgres"
}

case "${1:-}" in
  demarrer) demarrer ;;
  arreter) arreter ;;
  reinitialiser) arreter; rm -rf "$dossier"; demarrer ;;
  *) echo "Usage : $0 demarrer | arreter | reinitialiser" >&2; exit 2 ;;
esac
