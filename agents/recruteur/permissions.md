# Permissions — agent Recruteur

Source : `docs/prompt-claude-code.md` §5.2 (recopié tel quel).

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| Sources autorisées, fiches candidats, FAQ de recrutement, conditions validées, liste d'opposition | Fiches candidats minimales, brouillons de messages et d'accords, statuts du pipeline, liste d'opposition | Envoyer un premier message sans approbation, signer ou promettre, fixer une rémunération, contacter après un refus, collecter hors sources autorisées, créer un compte sans approbation |

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/recruteur.env` (modèle : `secrets/recruteur.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : recherche web, messagerie professionnelle, calendrier, base de données (rôle `agent_recruteur`).

Variables : `WEB_SEARCH_API_KEY`, `MAIL_API_KEY`, `CALENDAR_API_TOKEN`, `DATABASE_URL`, `DATABASE_AGENT_KEY`.

Aucune clé de paiement ni de signature électronique. La clé de la base est propre à cet agent et limitée à son rôle.

## Mise en œuvre (à faire)

Ces droits seront appliqués techniquement (rôle de base de données dédié, politiques d'accès au niveau des lignes, outils exposés à l'agent), pas seulement par le prompt.
