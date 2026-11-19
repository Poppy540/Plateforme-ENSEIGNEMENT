# Skills communes à tous les agents

Les skills tierces de ce dossier s'appliquent à **tous les agents** de la plateforme, en plus de leur prompt, de leurs permissions et des règles communes du §5.1 (`CLAUDE.md`).

Chaque skill retenue a son sous-dossier `skills/<nom>/SKILL.md` (en-tête `name` et `description`, puis instructions).

## Skills propres au projet

Écrites par Claude Code pour la plateforme, sans source extérieure. Elles ne s'appliquent qu'aux agents qui les chargent explicitement.

| Skill | Agents | Origine | Validée par le propriétaire |
|---|---|---|---|
| `eleves-mineurs` | Professeur, Évaluateur, Tuteur, Support | Écrite par Claude Code (Jalon 10, étape 3 ; ADR 0068) d'après les règles communes §5.1, les prompts des agents et la procédure de détresse | **À valider** (avant tout passage réel des agents) |

## Règles d'adoption d'une skill tierce

- Lire la skill en entier (instructions et scripts).
- Vérifier la licence et l'origine.
- Refuser tout ce qui exécute du code non audité, accède au réseau ou aux secrets.
- Adapter au contexte : programme du pays, élèves mineurs, français.

## Skills retenues

| Skill | Source (URL, commit) | Licence | Adaptations | Validée par le propriétaire |
|---|---|---|---|---|
| `contenu-non-fiable` | https://github.com/anthropics/knowledge-work-plugins, `small-business/shared/untrusted-content.md`, commit `8444efcd48f7012f09797778a36a33e73d0861f4` | Apache 2.0 (`LICENSE` copié) | Français ; contexte scolaire (élèves mineurs, parents, candidats) ; blocage des demandes de code SMS, mot de passe, paiement, suppression, changement de droits ou publication sans référent ; renvoi aux permissions de chaque agent ; priorité à la détresse ; noms de skills et connecteurs du plugin retirés | Validée par le propriétaire (liste validée le 2026-10-04) |
