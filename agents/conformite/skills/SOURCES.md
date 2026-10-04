# Skills — agent conformite

Statut : skills tierces adaptées après validation du propriétaire (ADR 0009) ; voir le tableau « Skills retenues ». Aucun plugin ni script installé.

Pistes : lecture de programmes en PDF, comparaison de référentiels.

Chaque skill retenue aura son sous-dossier `skills/<nom>/SKILL.md` (en-tête `name` et `description`, puis instructions).

## Règles d'adoption d'une skill tierce

- Lire la skill en entier (instructions et scripts).
- Vérifier la licence et l'origine.
- Refuser tout ce qui exécute du code non audité, accède au réseau ou aux secrets.
- Adapter au contexte : programme du pays, élèves mineurs, français.

## Skills retenues

| Skill | Source (URL, commit) | Licence | Adaptations | Validée par le propriétaire |
|---|---|---|---|---|
| `comparaison-de-referentiels` | https://github.com/GarethManning/education-agent-skills, `skills/curriculum-alignment/curriculum-crosswalk` (+ essentiel de `skills/curriculum-alignment/developmental-band-translator`), commit `6bbbce418f82e11044009c9f3b7373a354de5bd0` | CC BY-SA 4.0 (voir `LICENSE.md` du dossier) | Français ; fusion des deux skills ; bandes d'école remplacées par les classes et séries des packs pays ; courtes citations sourcées seulement ; classement universel / adaptable / local, statut réutilisable / à adapter / à recréer, confiance, statuts de donnée ; format de rapport de l'agent ; exemples remplacés ; escalade | Validée par le propriétaire (liste validée le 2026-10-04) |
| `audit-de-couverture` | https://github.com/GarethManning/education-agent-skills, `skills/curriculum-alignment/coverage-audit`, commit `6bbbce418f82e11044009c9f3b7373a354de5bd0` | CC BY-SA 4.0 (voir `LICENSE.md` du dossier) | Français ; exigences = référentiel du pays pour une unité, contenus audités = scripts, quiz, transcriptions ; statuts de donnée, confiance, source, niveau et série, action recommandée ; format de rapport de l'agent ; exemple de mathématiques ; escalade | Validée par le propriétaire (liste validée le 2026-10-04) |
