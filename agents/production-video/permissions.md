# Permissions — agent Production vidéo

Source : `docs/prompt-claude-code.md` §5.2 (recopié tel quel).

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| Scripts validés uniquement (statut, version, empreinte vérifiés) | Vidéos au statut à relire | Produire depuis un script non validé ou modifié, modifier le texte, publier, cloner une voix sans autorisation |

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/production-video.env` (modèle : `secrets/production-video.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : avatar, voix, hébergement vidéo, base de données (rôle `agent_production_video`).

Variables : `AVATAR_API_KEY`, `TTS_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`, `DATABASE_URL`, `DATABASE_AGENT_KEY`.

Aucune clé de paiement ni de signature électronique. La clé de la base est propre à cet agent et limitée à son rôle.

## Mise en œuvre (à faire)

Ces droits seront appliqués techniquement (rôle de base de données dédié, politiques d'accès au niveau des lignes, outils exposés à l'agent), pas seulement par le prompt.
