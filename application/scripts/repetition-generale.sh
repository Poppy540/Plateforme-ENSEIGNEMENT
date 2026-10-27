#!/usr/bin/env bash
# Répétition générale du déploiement, en local (Jalon 12, étape 3 ; ADR 0077), SIMULATION COUPÉE :
# base neuve → migrations suivies → import du pack pilote → vérification de la configuration → paquet → serveur du
# paquet → vérification du site → sauvegarde et restauration. Configuration de répétition FICTIVE : secrets tirés au
# hasard pour cette seule exécution (jamais écrits ni affichés), adresses en « .invalid », aucun appel à un service
# extérieur. Rien n'est déployé. Usage : depuis application/, `pnpm repetition`.
set -uo pipefail

racine="$(cd "$(dirname "$0")/.." && pwd)"
bin="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$bin/initdb" ] || bin="$(dirname "$(command -v initdb)")"
dossier="$(mktemp -d)"
port_base="${PG_PORT_REPETITION:-54334}"
port_site="${PORT_REPETITION:-3300}"
journal="$dossier/journal-serveur"
executer() { if [ "$(id -u)" = "0" ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
pid_serveur=""
nettoyer() {
  [ -n "$pid_serveur" ] && kill "$pid_serveur" 2>/dev/null
  executer "'$bin/pg_ctl' -D '$dossier/donnees' -m immediate stop" >/dev/null 2>&1 || true
  rm -rf "$dossier"
}
trap nettoyer EXIT
[ "$(id -u)" = "0" ] && chown postgres "$dossier"

resultats=()
echecs=0
etape() { # nom commande…
  local nom="$1"; shift
  if "$@" > "$dossier/sortie" 2>&1; then
    resultats+=("✓ $nom")
    [ "${REPETITION_DETAILS:-0}" = "1" ] && sed 's/^/    /' "$dossier/sortie" | tail -4
  else
    resultats+=("✗ $nom"); echecs=$((echecs + 1))
    sed 's/^/    /' "$dossier/sortie" | tail -15 >&2
  fi
}
aleatoire() { node -e "process.stdout.write(require('node:crypto').randomBytes(36).toString('base64url'))"; }

# 1. Base neuve (les rôles et le schéma « auth » de Supabase sont simulés, comme pour les tests de base).
executer "'$bin/initdb' -D '$dossier/donnees' -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null"
executer "'$bin/pg_ctl' -D '$dossier/donnees' -o '-p $port_base -k $dossier -c listen_addresses=127.0.0.1' -l '$dossier/journal-base' -w start >/dev/null"
admin="postgresql://postgres@127.0.0.1:$port_base/postgres"
psql_admin() { psql --dbname="$admin" -X -q -v ON_ERROR_STOP=1 "$@"; }
psql_admin -f "$racine/supabase/tests/00_simulation_supabase.sql" > /dev/null

# 2. Migrations suivies, d'abord simulées.
migrer() { URL_BASE_DONNEES_ADMIN="$admin" DOSSIER_MIGRATIONS="$racine/supabase/migrations" \
  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON "$racine/scripts/migrer.mts" "$@"; }
etape "Migrations simulées (aucune écriture)" migrer --simuler
etape "Migrations appliquées" migrer
etape "Second passage : base à jour" bash -c "$(declare -f migrer); admin='$admin'; racine='$racine'; migrer | grep -q 'Base à jour'"

# 3. Import du pack pilote, puis connexion du rôle de l'application (en production : avec un mot de passe).
importer() { node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON "$racine/scripts/pack-en-sql.mts" "$racine/../referentiels/gabon" | psql_admin -o /dev/null; }
etape "Import du pack pilote" importer
psql_admin -c "alter role serveur_application login" > /dev/null

# 4. Configuration de répétition, comme en production (valeurs fictives tirées au hasard, jamais affichées).
export ENVIRONNEMENT=production NODE_ENV=production
export URL_PUBLIQUE="https://repetition.invalid" MODE_AUTH=supabase
export URL_SUPABASE="https://supabase.repetition.invalid" CLE_PUBLIQUE_SUPABASE="$(aleatoire)" CLE_SERVICE_SUPABASE="$(aleatoire)"
export SECRET_SESSION="$(aleatoire)" SEL_AUDIT="$(aleatoire)" SEL_OPPOSITION="$(aleatoire)" JETON_EXECUTEUR="$(aleatoire)"
export URL_BASE_DONNEES="postgresql://serveur_application@127.0.0.1:$port_base/postgres"
export MODE_MODELE=anthropic ANTHROPIC_API_KEY="cle-fictive-de-repetition-$(aleatoire)" MODE_FILE=file MODE_VIDEO=aucun
export CONTACTS_VEILLE="+999 900 000 01" FOURNISSEUR_SMS=http FOURNISSEUR_EMAIL=http
export MESSAGERIE_HTTP_URL="https://messagerie.repetition.invalid" MESSAGERIE_HTTP_JETON="$(aleatoire)"
verifier_configuration() {
  node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON "$racine/scripts/verifier-production.mts" > "$dossier/configuration" 2>&1
  # Seul point attendu en échec hors ligne : l'API de données de Supabase, injoignable ici.
  local restants
  restants=$(grep "^À FAIRE" "$dossier/configuration" | grep -v "API de données Supabase" || true)
  [ -z "$restants" ] || { echo "$restants"; return 1; }
}
etape "Configuration de production complète (hors API Supabase, injoignable en local)" verifier_configuration

# 5. Paquet, puis serveur du paquet (un processus), simulation coupée.
etape "Paquet de déploiement" bash "$racine/scripts/paquet.sh" "$dossier/paquet"
if [ -f "$dossier/paquet/application/server.js" ]; then
  (cd "$dossier/paquet/application" && PORT="$port_site" HOSTNAME=127.0.0.1 node server.js > "$journal" 2>&1) &
  pid_serveur=$!
  for _ in $(seq 1 40); do curl -s -o /dev/null "http://127.0.0.1:$port_site/api/sante" && break; sleep 1; done
  etape "Serveur du paquet : santé" bash -c "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$port_site/api/sante | grep -q 200"
  etape "Vérification du site (simulation fermée, accès refusés)" \
    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON "$racine/scripts/verifier-site.mts" "http://127.0.0.1:$port_site" --local
  # Le secret de session est cherché par la variable d'environnement, jamais écrit dans une ligne de commande.
  etape "Journal du serveur sans erreur ni donnée sensible" env JOURNAL="$journal" bash -c \
    '! grep -q "\"niveau\":\"erreur\"" "$JOURNAL" && ! grep -qiE "postgresql://|Bearer [A-Za-z0-9]" "$JOURNAL" && ! grep -qF "$SECRET_SESSION" "$JOURNAL"'
  kill "$pid_serveur" 2>/dev/null; pid_serveur=""
fi

# 6. Sauvegarde, puis restauration dans une base vide du même serveur.
psql_admin -c "create database restauration" > /dev/null
etape "Sauvegarde" env URL_BASE_DONNEES_ADMIN="$admin" bash "$racine/scripts/sauvegarde-base.sh" sauvegarder "$dossier/sauvegardes"
sauvegarde="$(ls -d "$dossier"/sauvegardes/sauvegarde-* 2>/dev/null | head -1)"
etape "Restauration vérifiée" env URL_BASE_DONNEES_CIBLE="postgresql://postgres@127.0.0.1:$port_base/restauration" \
  bash "$racine/scripts/sauvegarde-base.sh" restaurer "$sauvegarde" --confirmer

echo
echo "Répétition générale du déploiement (locale, simulation coupée)"
printf '%s\n' "${resultats[@]}"
cat <<'TEXTE'

Non essayé en local (à faire sur le vrai site, guide de mise en route E3) :
- https, certificat et HSTS (répartiteur ou hébergeur) ;
- authentification Supabase (codes SMS et email) et fermeture de l'API de données ;
- envoi réel des SMS et des emails (passerelle ou fournisseurs) ;
- appels au modèle Claude (clé réelle) et vidéo (Cloudflare Stream) ;
- sauvegardes de l'hébergeur de la base.
TEXTE
if [ "$echecs" -eq 0 ]; then echo "RÉPÉTITION GÉNÉRALE RÉUSSIE"; else echo "$echecs étape(s) en échec"; exit 1; fi
