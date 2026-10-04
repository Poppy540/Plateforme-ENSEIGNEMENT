# Permissions — agent Tuteur

Source : `docs/prompt-claude-code.md` §5.2 (recopié tel quel).

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| Progression, graphe de prérequis | Recommandations de révision, rapports parents si consentement enregistré | Contacter les parents sans consentement enregistré, diagnostiquer, comparer des élèves |

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/tuteur.env` (modèle : `secrets/tuteur.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : base de données (rôle `agent_tuteur`).

Variables : `DATABASE_URL`, `DATABASE_AGENT_KEY`.

Aucune clé de paiement ni de signature électronique. La clé de la base est propre à cet agent et limitée à son rôle.

## Mise en œuvre (à faire)

Ces droits seront appliqués techniquement (rôle de base de données dédié, politiques d'accès au niveau des lignes, outils exposés à l'agent), pas seulement par le prompt.
