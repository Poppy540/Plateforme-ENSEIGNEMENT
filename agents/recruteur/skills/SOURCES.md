# Skills — agent recruteur

Statut : skills tierces adaptées après validation du propriétaire (ADR 0009) ; voir le tableau « Skills retenues ». Aucun plugin ni script installé.

Pistes : sourcing éthique et qualification, messages de prise de contact transparents, préparation et synthèse d'entretien, dossier d'accord, protection des données personnelles.

Chaque skill retenue aura son sous-dossier `skills/<nom>/SKILL.md` (en-tête `name` et `description`, puis instructions).

## Règles d'adoption d'une skill tierce

- Lire la skill en entier (instructions et scripts).
- Vérifier la licence et l'origine.
- Refuser tout ce qui exécute du code non audité, accède au réseau ou aux secrets.
- Adapter au contexte : programme du pays, élèves mineurs, français.

## Skills retenues

| Skill | Source (URL, commit) | Licence | Adaptations | Validée par le propriétaire |
|---|---|---|---|---|
| `preselection-equitable` | https://github.com/anthropics/knowledge-work-plugins, `small-business/skills/hiring-screener/` (SKILL.md et `reference/*`) et `small-business/shared/personal-data.md`, commit `8444efcd48f7012f09797778a36a33e73d0861f4` | Apache 2.0 (`LICENSE` copié) | Français ; grille uniquement pédagogique et professionnelle définie par {{RESPONSABLE}} ; critères interdits explicites (religion, opinions, santé, origine, situation familiale, sexe, âge, tout critère non pédagogique) ; catégorie « impossible à évaluer » ; aucun envoi sans approbation ; aucune pièce d'identité conservée ; liste d'opposition ; retirés : WebFetch, Gmail, agenda, Gusto, DocuSign, Drive/M365, Trello, Zapier, paie, offre, rémunération, checklist d'intégration | Validée par le propriétaire (liste validée le 2026-10-04) |
