# Skills — agent Coordinateur de famille

Liste issue de `docs/cadrage.md`, Partie G. Les skills du tableau ci-dessous sont **rédigées pour ce projet** ; les skills tierces adaptées figurent dans « Skills retenues ».

| Skill | Rôle | Source | Licence | Statut |
|---|---|---|---|---|
| `cartographie-curriculaire-verticale` | Construire la carte des notions d'une famille de matières, de la première à la dernière classe du référentiel : où chaque notion est introduite, reprise et approfondie, et où se trouvent les trous et les redites | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `graphe-prerequis` | Proposer et maintenir le graphe de prérequis entre chapitres d'une famille de matières, et vérifier qu'il n'a ni cycle ni chapitre isolé | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `coherence-terminologique` | Établir et faire respecter la charte de la famille : glossaire, notations, unités, présentation des méthodes et niveau de langage par niveau | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `alignement-objectifs-evaluation` | Vérifier que chaque chapitre a des objectifs mesurables et que les activités et les quiz évaluent bien ces objectifs | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `revue-qualite-contenu` | Relire un contenu de la famille (script, quiz, transcription) avec une grille de qualité commune | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `analyse-items-erreurs` | Analyser les résultats agrégés et anonymisés des quiz d'une famille : difficulté, pouvoir discriminant, erreurs types, questions défectueuses | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `socle-et-extensions` | Séparer, pour une famille, le contenu commun à plusieurs séries (socle) des variantes propres à chaque série (extensions), sans doublons | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `planification-production` | Proposer un ordre de production des chapitres d'une famille qui respecte les prérequis, le poids des examens et la charge de relecture des référents | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `briefing-referent` | Rédiger une synthèse courte pour l'enseignant-référent de la famille, avec les décisions à prendre et leur priorité | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `files-d-approbation` | Présenter au référent ce qui attend, par priorité : alertes, puis ce qui bloque les chapitres du pilote, puis le reste ; plan de production commençant par le pilote (ADR 0071) | Projet (Jalon 11) | Propriétaire du projet | **à valider par le propriétaire** |
| `comparaison-referentiels-pays` | Avec l'agent Conformité programme, classer les chapitres de la famille en universel, adaptable ou local pour un nouveau pays | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `coordination-maths` | Points de vigilance propres à la famille Mathématiques pour l'agent Coordinateur | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `coordination-francais` | Points de vigilance propres à la famille Français pour l'agent Coordinateur | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `coordination-langues` | Points de vigilance propres à la famille Langues vivantes (Anglais, Espagnol) pour l'agent Coordinateur | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `coordination-sciences` | Points de vigilance propres à la famille Sciences (SVT, Physique-Chimie) pour l'agent Coordinateur | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `coordination-histoire-geo-ses` | Points de vigilance propres à la famille Histoire-Géographie, Éducation civique et SES pour l'agent Coordinateur | Projet (Partie G) | Propriétaire du projet | à valider par le référent |
| `coordination-philosophie` | Points de vigilance propres à la famille Philosophie pour l'agent Coordinateur | Projet (Partie G) | Propriétaire du projet | à valider par le référent |

## Skill tierce à examiner

- « course-designer » (citée par la Partie G pour `alignement-objectifs-evaluation`) : non trouvée ni lue à ce jour. Elle ne sera reprise qu'après lecture complète, vérification de la licence et accord du propriétaire.
- `learning-progression-builder` (GarethManning, CC BY-SA 4.0) : adoptée et adaptée en `progression-d-apprentissage` (voir « Skills retenues »).
- `scope-and-sequence-designer` (GarethManning) : inspiration seulement, non reprise.

## Skills retenues

| Skill | Source (URL, chemin, commit) | Licence | Adaptations | Validée par le propriétaire |
|---|---|---|---|---|
| `progression-d-apprentissage` | https://github.com/GarethManning/education-agent-skills, `skills/curriculum-assessment/learning-progression-builder`, commit `6bbbce418f82e11044009c9f3b7373a354de5bd0` | CC BY-SA 4.0 (voir `LICENSE.md` du dossier) | Français, collège-lycée, référentiel du pays ; entrée « profils d'élèves » retirée (aucune donnée individuelle) ; sortie au statut brouillon pour le référent, liens de prérequis au format de `graphe-prerequis` ; exemple de mathématiques ; règles de sécurité et d'escalade | Validée par le propriétaire (liste validée le 2026-10-04) |
