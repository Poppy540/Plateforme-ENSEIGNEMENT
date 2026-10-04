# Permissions — agent Évaluateur

Source : `docs/prompt-claude-code.md` §5.2 (recopié tel quel).

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| Chapitre, banque d'exercices, réponses de l'élève | Quiz au statut brouillon, scores de l'élève | Publier un quiz, modifier un score déjà enregistré |

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/evaluateur.env` (modèle : `secrets/evaluateur.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : base de données (rôle `agent_evaluateur`).

Variables : `DATABASE_URL`, `DATABASE_AGENT_KEY`.

Aucune clé de paiement ni de signature électronique. La clé de la base est propre à cet agent et limitée à son rôle.

## Mise en œuvre (à faire)

Ces droits seront appliqués techniquement (rôle de base de données dédié, politiques d'accès au niveau des lignes, outils exposés à l'agent), pas seulement par le prompt.
