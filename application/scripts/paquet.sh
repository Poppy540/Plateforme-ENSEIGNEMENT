#!/usr/bin/env bash
# Paquet de déploiement (Jalon 12, étape 2 ; ADR 0076) : serveur autonome et fichiers lus à l'exécution (prompts,
# skills, packs pays, règles communes), sans aucun secret, sans fichier de test ni donnée fictive.
# Usage : pnpm paquet [dossier]   (défaut : ../paquet, ignoré par git)
set -euo pipefail

racine="$(cd "$(dirname "$0")/.." && pwd)"
depot="$(cd "$racine/.." && pwd)"
sortie="${1:-$depot/paquet}"
case "$sortie" in "$depot"|"$racine"|/|"") echo "Dossier de sortie refusé : $sortie" >&2; exit 2 ;; esac

cd "$racine"
SORTIE_AUTONOME=1 pnpm build > /dev/null
[ -f .next/standalone/server.js ] || { echo "Construction autonome introuvable." >&2; exit 1; }

# Ancien paquet (produit par cette commande) remplacé.
if [ -e "$sortie" ]; then
  [ -f "$sortie/VERSION" ] || { echo "$sortie existe et n'est pas un paquet : rien n'est effacé." >&2; exit 2; }
  rm -rf "${sortie:?}"
fi
mkdir -p "$sortie/application/.next" "$sortie/docs" "$sortie/deploiement"

# Serveur autonome, sans les sources ni les tests que le traçage a pu ramasser.
cp -a .next/standalone/. "$sortie/application/"
rm -rf "${sortie:?}/application/src" "${sortie:?}/application/tests"
cp -a .next/static "$sortie/application/.next/static"
cp -a public "$sortie/application/public"
rm -rf "${sortie:?}/application/public/simulation"

# Fichiers lus à l'exécution.
mkdir -p "$sortie/agents"
for agent in "$depot"/agents/*/; do
  nom="$(basename "$agent")"
  mkdir -p "$sortie/agents/$nom"
  [ -f "$agent/prompt.md" ] && cp "$agent/prompt.md" "$sortie/agents/$nom/"
  [ -d "$agent/skills" ] && cp -a "$agent/skills" "$sortie/agents/$nom/skills"
done
mkdir -p "$sortie/referentiels"
for pack in "$depot"/referentiels/*/; do
  nom="$(basename "$pack")"
  case "$nom" in _*|zz-*) continue ;; esac # modèle et packs de test : jamais en production
  grep -q "^statut_pack: test" "$pack/pays.yaml" 2>/dev/null && continue
  cp -a "$pack" "$sortie/referentiels/$nom"
done
cp "$depot/docs/prompt-claude-code.md" "$sortie/docs/"
cp deploiement/plateforme@.service deploiement/Caddyfile.exemple "$sortie/deploiement/"
cp deploiement/LISEZ-MOI.md "$sortie/LISEZ-MOI.md"
{
  echo "commit $(git -C "$depot" rev-parse --short HEAD 2>/dev/null || echo inconnu)$(git -C "$depot" diff --quiet 2>/dev/null || echo ' (modifications non commitées)')"
  echo "construit le $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$sortie/VERSION"

# Contrôles : aucun fichier d'environnement, de sauvegarde, de test ou de données fictives.
interdits=$(find "$sortie" \( -name ".env*" -o -name "*.dump" -o -name "*.spec.ts" -o -name "*.test.ts" \
  -o -path "*/tests/*" -o -path "*/zz-fictif*" -o -path "*/sauvegardes/*" \) -print | head -5)
if [ -n "$interdits" ]; then
  echo "Paquet refusé : fichiers interdits trouvés :" >&2
  echo "$interdits" >&2
  rm -rf "${sortie:?}"
  exit 1
fi
echo "Paquet prêt : $sortie ($(du -sh "$sortie" | cut -f1)) — $(head -1 "$sortie/VERSION")"
