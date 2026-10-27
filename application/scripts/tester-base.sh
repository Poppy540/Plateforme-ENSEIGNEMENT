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
# Migrations appliquées par l'outil de production (ADR 0075), suivies en base.
URL_BASE_DONNEES_ADMIN="postgresql://postgres@/postgres?host=$dossier&port=$port" \
  DOSSIER_MIGRATIONS="$racine/supabase/migrations" \
  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON "$racine/scripts/migrer.mts" > /dev/null
psql_test -f "$racine/supabase/tests/10_donnees_fictives.sql"
psql_test -f "$racine/supabase/tests/20_tests_acces.sql"
psql_test -f "$racine/supabase/tests/41_tests_echanges.sql"

# Import des packs pays : pack pilote deux fois (idempotence), puis pack fictif.
pack_sql() { node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON "$racine/scripts/pack-en-sql.mts" "$@"; }
pack_sql "$racine/../referentiels/gabon" > "$dossier/pilote.sql"
pack_sql "$racine/tests/packs/yy-fictif" > "$dossier/fictif.sql"
# Pack de test « zz » (référentiels/, statut test) : refusé sans --test, puis importé à côté du pilote.
if pack_sql "$racine/../referentiels/zz-fictif" > /dev/null 2>&1; then echo "Pack de test importé sans --test" >&2; exit 1; fi
pack_sql "$racine/../referentiels/zz-fictif" --test > "$dossier/zz.sql"
psql_test -f "$dossier/pilote.sql" -o /dev/null
psql_test -f "$dossier/pilote.sql" -o /dev/null
psql_test -f "$dossier/fictif.sql" -o /dev/null
psql_test -f "$dossier/zz.sql" -o /dev/null
psql_test -f "$racine/supabase/tests/30_tests_import.sql"

# Réimport après modification, dans le pack, d'un chapitre déjà validé.
psql_test -f "$racine/supabase/tests/31_chapitre_valide_puis_reimporte.sql"
sed "s/des opérations'/des opérations (révisé)'/" "$dossier/fictif.sql" > "$dossier/fictif-modifie.sql"
psql_test -f "$dossier/fictif-modifie.sql" -o /dev/null
psql_test -f "$racine/supabase/tests/32_tests_reimport.sql"
psql_test -f "$racine/supabase/tests/40_tests_referents.sql"
psql_test -f "$racine/supabase/tests/43_tests_contenus.sql"
psql_test -f "$racine/supabase/tests/44_tests_evaluateur.sql"
psql_test -f "$racine/supabase/tests/45_tests_production_video.sql"
psql_test -f "$racine/supabase/tests/46_tests_lecture_videos.sql"
psql_test -f "$racine/supabase/tests/47_tests_jalon_3.sql"
psql_test -f "$racine/supabase/tests/48_tests_orchestrateur.sql"
psql_test -f "$racine/supabase/tests/49_tests_tuteur.sql"
psql_test -f "$racine/supabase/tests/50_tests_rapports_parents.sql"
psql_test -f "$racine/supabase/tests/51_tests_file_humaine.sql"
psql_test -f "$racine/supabase/tests/52_tests_acces_eleves.sql"
psql_test -f "$racine/supabase/tests/53_tests_veille_et_quotas.sql"
psql_test -f "$racine/supabase/tests/54_tests_prerequis.sql"
psql_test -f "$racine/supabase/tests/55_tests_coordinateur.sql"
psql_test -f "$racine/supabase/tests/56_tests_conformite.sql"
psql_test -f "$racine/supabase/tests/57_tests_recruteur.sql"
psql_test -f "$racine/supabase/tests/58_tests_portabilite.sql"
psql_test -f "$racine/supabase/tests/59_tests_revue_securite.sql"
psql_test -f "$racine/supabase/tests/60_tests_exploitation.sql"
psql_test -f "$racine/supabase/tests/61_tests_decisions_securite.sql"
psql_test -f "$racine/supabase/tests/62_tests_liens_entre_familles.sql"
psql_test -f "$racine/supabase/tests/63_tests_lecons_ecrites.sql"
psql_test -f "$racine/supabase/tests/64_tests_mesures_pilote.sql"
psql_test -f "$racine/supabase/tests/65_tests_classes.sql"
psql_test -f "$racine/supabase/tests/66_tests_invitations_administration.sql"
psql_test -f "$racine/supabase/tests/67_tests_classes_administration.sql"
psql_test -f "$racine/supabase/tests/68_tests_chapitres_pilote.sql"
psql_test -f "$racine/supabase/tests/69_tests_conditions_pilote.sql"
psql_test -f "$racine/supabase/tests/70_tests_criteres_suspension.sql"
psql_test -f "$racine/supabase/tests/71_tests_journal_pilote.sql"
psql_test -f "$racine/supabase/tests/72_tests_semaine_pilote.sql"
psql_test -f "$racine/supabase/tests/42_tests_conservation.sql"
echo "TOUS LES TESTS DE BASE SONT PASSÉS"
