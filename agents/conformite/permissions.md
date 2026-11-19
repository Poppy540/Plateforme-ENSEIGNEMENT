# Permissions — agent Conformité programme

Source : `docs/prompt-claude-code.md` §5.2 (recopié tel quel).

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| Référentiel pays, contenus existants | Rapports d'écart | Modifier le référentiel validé, déclarer une conformité définitive |

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/conformite.env` (modèle : `secrets/conformite.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : base de données (rôle `agent_conformite`).

Variables : `DATABASE_URL`, `DATABASE_AGENT_KEY`.

Aucune clé de paiement ni de signature électronique. La clé de la base est propre à cet agent et limitée à son rôle.

## Mise en œuvre (ADR 0039)

- Rôle de base `agent_conformite` : référentiel, unité comparée et document fixés par le serveur ; lecture du référentiel du pays, de **son seul document** et des scripts et quiz **validés** de l'unité ; **aucune** table d'élève lisible ; aucune écriture dans le référentiel.
- Écrit uniquement des rapports d'écart au statut brouillon (version et statut imposés par la base) et des signalements sans élève.
- Ne déclare jamais une conformité : « conforme » n'existe pas dans sa sortie ; le serveur refuse toute donnée « officielle » sans source ou issue d'un document non déclaré officiel.
- Son extraction devient, au choix du référent, un brouillon YAML à relire et à ranger dans le pack (import « à valider »).
