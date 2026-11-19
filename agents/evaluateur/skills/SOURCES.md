# Skills — agent evaluateur

Statut : skills tierces adaptées après validation du propriétaire (ADR 0009) ; voir le tableau « Skills retenues ». Aucun plugin ni script installé.

Pistes : QCM avec distracteurs plausibles, analyse des erreurs.

Chaque skill retenue aura son sous-dossier `skills/<nom>/SKILL.md` (en-tête `name` et `description`, puis instructions).

## Règles d'adoption d'une skill tierce

- Lire la skill en entier (instructions et scripts).
- Vérifier la licence et l'origine.
- Refuser tout ce qui exécute du code non audité, accède au réseau ou aux secrets.
- Adapter au contexte : programme du pays, élèves mineurs, français.

## Skills retenues

| Skill | Source (URL, commit) | Licence | Adaptations | Validée par le propriétaire |
|---|---|---|---|---|
| `questions-de-controle` | https://github.com/anthropics/k12-teacher-skills, `plugin/skills/k12-check-for-understanding` (SKILL.md et references/*.md), commit `281eb8d41fe2837d911541c9bbb870b58add804c` | Apache 2.0 (`LICENSE` et `NOTICE` recopiés dans le dossier) | Français, collège-lycée ; quiz au statut brouillon ; distracteurs = erreurs documentées (banque d'exercices de l'unité, erreurs anonymisées) ; renvois au graphe de prérequis validé ; double vérification conservée (sans exécution de code) ; retirés : connecteur Learning Commons, normes américaines, `$OUTPUT_DIR` et sortie HTML ; `references/mathematiques.md` et `references/verification.md` adaptés | Validée par le propriétaire (liste validée le 2026-10-04) |
