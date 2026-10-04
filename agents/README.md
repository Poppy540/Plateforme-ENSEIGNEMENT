# Agents

| Dossier | Agent | Source du prompt |
|---|---|---|
| `professeur/` | Professeur (un modèle, instancié par unité) | Cadrage, Partie B |
| `scenariste/` | Scénariste | Partie C1 |
| `production-video/` | Production vidéo | Partie C2 |
| `evaluateur/` | Évaluateur | Partie C3 |
| `tuteur/` | Tuteur | Partie C4 |
| `conformite/` | Conformité programme | Partie C5 |
| `support/` | Support/inscription | Partie C6 |
| `orchestrateur/` | Orchestrateur | Partie C7 |
| `recruteur/` | Recruteur d'enseignants-référents | Partie E |
| `coordinateur/` | Coordinateur de famille de matières (une instance par famille) | Partie G |

`_commun/skills/` contient les skills qui s'appliquent à **tous** les agents (par exemple `contenu-non-fiable`).

Chaque dossier d'agent contient :

- `prompt.md` : recopié **tel quel** du cadrage (extrait automatiquement des blocs de code). Toute modification passe par le propriétaire.
- `permissions.md` : droits tirés du §5.2 du prompt maître, et clés de l'agent.
- `skills/` : `SOURCES.md` (aucune skill installée à ce jour).
- `tests/` : scénarios Gherkin tirés des Parties D et E. La batterie commune TC est dans `tests/commun/`.

Les règles communes du §5.1 (`CLAUDE.md`) s'appliquent à tous les agents en plus de leur prompt. Les variables `{{...}}` sont remplies par la configuration de l'unité ou du pays (`referentiels/<pays>/agents/`).
