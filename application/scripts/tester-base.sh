#!/usr/bin/env bash
# Applique les migrations sur un Postgres local jetable et lance les tests d'accès.
# Usage : depuis application/, `pnpm test:base`. Nécessite les binaires PostgreSQL (initdb, pg_ctl, psql).
set -euo pipefail

racine="$(cd "$(dirname "$0")/.." && pwd)"
bin="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$bin/initdb" ] || bin="$(dirname "$(command -v initdb)")"
dossier="$(mktemp -d)"
port="${PG_PORT_TEST:-54329}"

nettoyer() { "$bin/pg_ctl" -D "$dossier/donnees" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$dossier"; }
trap nettoyer EXIT

# Postgres refuse de tourner en root : on utilise un utilisateur sans privilège si besoin.
executer() { if [ "$(id -u)" = "0" ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
[ "$(id -u)" = "0" ] && chown postgres "$dossier"

executer "'$bin/initdb' -D '$dossier/donnees' -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null"
executer "'$bin/pg_ctl' -D '$dossier/donnees' -o '-p $port -k $dossier -c listen_addresses=' -l '$dossier/journal' -w start >/dev/null"

psql_test() { psql -h "$dossier" -p "$port" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

psql_test -f "$racine/supabase/tests/00_simulation_supabase.sql"
for migration in "$racine"/supabase/migrations/*.sql; do
  psql_test -f "$migration"
done
psql_test -f "$racine/supabase/tests/10_donnees_fictives.sql"
psql_test -f "$racine/supabase/tests/20_tests_acces.sql"
