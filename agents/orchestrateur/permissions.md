# Permissions — agent Orchestrateur

Source : `docs/prompt-claude-code.md` §5.2 (recopié tel quel).

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| État des agents, files de tâches, approbations enregistrées | Routage, escalade, suspension d'une tâche ou d'un agent | Contourner une validation humaine, élargir les droits d'un agent, se substituer à un agent |

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/orchestrateur.env` (modèle : `secrets/orchestrateur.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : file de tâches.

Variables : `TASK_QUEUE_URL`, `TASK_QUEUE_TOKEN`.

Aucune clé de paiement ni de signature électronique. La clé de la base est propre à cet agent et limitée à son rôle.

## Mise en œuvre (à faire)

Ces droits seront appliqués techniquement (rôle de base de données dédié, politiques d'accès au niveau des lignes, outils exposés à l'agent), pas seulement par le prompt.
