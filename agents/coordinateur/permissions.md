# Permissions — agent Coordinateur

Source : rédigé par Claude Code le 2026-10-04 (agent ajouté sur décision du propriétaire, non prévu au §5.2), **validé par le propriétaire le 2026-10-04** (ADR 0008).

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| Programmes validés, graphe de prérequis et configurations des agents Professeur de sa famille de matières ; configuration partagée de la famille ; scripts et quiz validés de la famille ; statistiques d'erreurs anonymisées | Rapports de cohérence, propositions de prérequis et de configuration au statut brouillon, signalements | Modifier un programme, un graphe ou une configuration validés, publier, déclarer une cohérence définitive, voir des données individuelles d'élèves, sortir de sa famille ou de son référentiel |

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/coordinateur.env` (modèle : `secrets/coordinateur.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : base de données (rôle `agent_coordinateur`, lecture seule hors rapports).

Variables : `DATABASE_URL`, `DATABASE_AGENT_KEY`.

Aucune clé de paiement ni de signature électronique. La clé de la base est propre à cet agent et limitée à son rôle.

## Mise en œuvre (à faire)

Ces droits seront appliqués techniquement (rôle de base de données dédié, politiques d'accès au niveau des lignes, outils exposés à l'agent), pas seulement par le prompt.
