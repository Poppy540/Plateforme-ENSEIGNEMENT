# Skills — agent support

Statut : skills tierces adaptées après validation du propriétaire (ADR 0009) ; voir le tableau « Skills retenues ». Aucun plugin ni script installé.

Pistes : FAQ et accueil WhatsApp, tri des demandes.

Chaque skill retenue aura son sous-dossier `skills/<nom>/SKILL.md` (en-tête `name` et `description`, puis instructions).

## Règles d'adoption d'une skill tierce

- Lire la skill en entier (instructions et scripts).
- Vérifier la licence et l'origine.
- Refuser tout ce qui exécute du code non audité, accède au réseau ou aux secrets.
- Adapter au contexte : programme du pays, élèves mineurs, français.

## Skills retenues

| Skill | Source (URL, commit) | Licence | Adaptations | Validée par le propriétaire |
|---|---|---|---|---|
| `tri-des-demandes` | https://github.com/anthropics/knowledge-work-plugins, `customer-support/skills/ticket-triage/SKILL.md`, commit `8444efcd48f7012f09797778a36a33e73d0861f4` | Apache 2.0 (`LICENSE` copié) | Français ; catégories scolaires (inscription, connexion/code SMS, classe ou série, accès aux cours, question de cours → Professeur, paiement/remboursement/suppression → humain uniquement, détresse → humain immédiatement, signalement de contenu) ; 3 niveaux de priorité ; SLA, outils externes et modèles anglais retirés ; modèles approuvés uniquement | Validée par le propriétaire (liste validée le 2026-10-04) |
