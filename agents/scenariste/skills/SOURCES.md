# Skills — agent scenariste

Statut : skills tierces adaptées après validation du propriétaire (ADR 0009) ; voir le tableau « Skills retenues ». Aucun plugin ni script installé.

Pistes : script vidéo pédagogique, découpage de chapitre, ancrage local.

Chaque skill retenue aura son sous-dossier `skills/<nom>/SKILL.md` (en-tête `name` et `description`, puis instructions).

## Règles d'adoption d'une skill tierce

- Lire la skill en entier (instructions et scripts).
- Vérifier la licence et l'origine.
- Refuser tout ce qui exécute du code non audité, accède au réseau ou aux secrets.
- Adapter au contexte : programme du pays, élèves mineurs, français.

## Skills retenues

| Skill | Source (URL, commit) | Licence | Adaptations | Validée par le propriétaire |
|---|---|---|---|---|
| `script-pense-a-voix-haute` | https://github.com/GarethManning/education-agent-skills, `skills/explicit-instruction/think-aloud-script-generator`, commit 6bbbce418f82e11044009c9f3b7373a354de5bd0 | CC BY-SA 4.0 (LICENSE.md dans le dossier) | Français, passage de script vidéo au statut brouillon pour avatar IA, pauses vidéo, chapitre validé uniquement, [À VÉRIFIER], pas de texte protégé, escalade des sujets sensibles, références britanniques et profils d'élèves individuels retirés | Validée par le propriétaire (liste validée le 2026-10-04) |
| `ancrage-local` | https://github.com/GarethManning/education-agent-skills, `skills/global-cross-cultural-pedagogies/place-based-inquiry-anchor`, commit 6bbbce418f82e11044009c9f3b7373a354de5bd0 | CC BY-SA 4.0 (LICENSE.md dans le dossier) | Français, exemples tirés de `referentiels/<pays>/contexte-local.yaml` et marqués « à valider », anti-stéréotypes, programme validé comme point de départ, sorties de terrain et contacts extérieurs retirés, sujets sensibles escaladés | Validée par le propriétaire (liste validée le 2026-10-04) |
