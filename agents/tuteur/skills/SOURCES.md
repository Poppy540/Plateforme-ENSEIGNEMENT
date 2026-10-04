# Skills — agent tuteur

Statut : skills tierces adaptées après validation du propriétaire (ADR 0009) ; voir le tableau « Skills retenues ». Aucun plugin ni script installé.

Pistes : parcours adaptatif, usage du graphe de prérequis.

Chaque skill retenue aura son sous-dossier `skills/<nom>/SKILL.md` (en-tête `name` et `description`, puis instructions).

## Règles d'adoption d'une skill tierce

- Lire la skill en entier (instructions et scripts).
- Vérifier la licence et l'origine.
- Refuser tout ce qui exécute du code non audité, accède au réseau ou aux secrets.
- Adapter au contexte : programme du pays, élèves mineurs, français.

## Skills retenues

| Skill | Source (URL, commit) | Licence | Adaptations | Validée par le propriétaire |
|---|---|---|---|---|
| Progression d'apprentissage et graphe de prérequis (pas de skill copiée) | Produits par l'agent Coordinateur avec sa skill `agents/coordinateur/skills/progression-d-apprentissage` (adaptée de https://github.com/GarethManning/education-agent-skills, `skills/curriculum-assessment/learning-progression-builder`, commit `6bbbce418f82e11044009c9f3b7373a354de5bd0`) | CC BY-SA 4.0 (côté Coordinateur) | Le Tuteur n'utilise que la progression et le graphe **validés** par le référent, en lecture, pour remonter à la notion de base manquante ; aucune copie de la skill dans ce dossier | Validée par le propriétaire (liste validée le 2026-10-04) |
