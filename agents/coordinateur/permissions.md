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

## Mise en œuvre (à faire)

Ces droits seront appliqués techniquement (rôle de base de données dédié, politiques d'accès au niveau des lignes, statistiques agrégées avec un seuil minimal d'effectif), pas seulement par le prompt.
