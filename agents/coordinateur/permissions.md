# Permissions — agent Coordinateur de famille

Source : `docs/prompt-claude-code.md` §5.2 (recopié tel quel) ; détail dans `docs/cadrage.md`, Partie G.

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| Référentiel, contenus de sa famille (tous niveaux et séries), graphe de prérequis, statistiques d'erreurs anonymisées et agrégées | Propositions de graphe, glossaire, charte et plans de production au statut brouillon, rapports de cohérence | Valider ou publier, modifier le référentiel validé, lire des données individuelles d'élèves, modifier prompts ou droits d'un agent, contacter élèves, parents ou candidats |

Précision de la Partie G : il ne répond jamais à un élève.

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/coordinateur.env` (modèle : `secrets/coordinateur.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : URL de la base et clé à rôle restreint (`agent_coordinateur` : lecture des contenus de sa famille, écriture de brouillons). Aucune autre clé.

Variables : `DATABASE_URL`, `DATABASE_AGENT_KEY`.

## Mise en œuvre (ADR 0038)

- Rôle de base `agent_coordinateur` : famille et référentiel fixés par le serveur ; lecture du catalogue, des chapitres et liens de la famille, des scripts et quiz **validés** de la famille ; statistiques agrégées seulement pour les quiz d'au moins 5 tentatives (seuil non abaissable) ; **aucune** table d'élève lisible.
- Écrit uniquement des rapports au statut brouillon (version et statut imposés par la base) et des signalements sans élève.
- Toute décision (lien accepté, proposition écartée, glossaire adopté comme charte, rapport clos) est prise par un référent de la famille, vérifiée par la base ; un lien accepté ne peut ni créer de cycle ni venir d'une classe supérieure.
- Lancé par l'Orchestrateur (type `coherence_famille`) ; il ne parle jamais aux élèves.
