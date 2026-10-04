# Sources du pack Gabon

Statuts : **validé** (confirmé par un enseignant-référent sur le programme officiel) · **à valider** (provisoire) · **manquant**.

À ce jour, **aucune donnée n'est validée** : aucun enseignant-référent n'est recruté et les programmes officiels de l'IPN n'ont pas été obtenus.

| Fichier | Donnée | Origine | Statut |
|---|---|---|---|
| `pays.yaml` | Langue, monnaie, fuseau, moyens de paiement | Cadrage (connaissances générales) | à valider |
| `structure.yaml` | Cycles, niveaux, examens (BEPC, Bac) | Cadrage, « Cadre général » | à valider |
| `structure.yaml` | Séries A1, A2, B, C, D | Cadrage, « Filières du lycée » | à valider |
| `structure.yaml` | Séries techniques F/G | Cadrage : intitulés et coefficients variables selon les réformes | manquant (hors périmètre) |
| `matieres.yaml` | Liste des matières et familles | Cadrage, matrice des unités et familles de matières | à valider |
| `matieres.yaml` | Couche universel / adaptable / local | Cadrage : « hypothèse de travail » | à valider |
| `matieres.yaml` | Allemand en LV2 (Seconde) | Cité dans le cadrage, absent de la matrice (décision 0007) | non retenu, à valider |
| `unites.yaml` | 67 unités | Cadrage, « Matrice des unités » | à valider |
| `programmes/ga-3e-mathematiques.yaml` | 7 chapitres de Maths 3e | Cadrage : « base sur un programme francophone standard » | à valider |
| `programmes/ga-3e-mathematiques.yaml` | Volumes horaires, coefficients | — | manquant |
| `profils-niveau.yaml` | Langage, durées de vidéo par niveau | Cadrage : « repères de départ » | à valider |
| `familles.yaml` | Méthode et garde-fous par famille | Cadrage, « Compétences et méthode par famille » | à valider |
| `contexte-local.yaml` | Exemples locaux | Cadrage | à valider |
| `agents/professeur/ga-3e-mathematiques.yaml` | Variables du prompt Professeur | Cadrage, Partie B | à valider |
| (futur) Histoire-Géographie 6e | Intitulés | Programmes IPN 1993/1996, via l'étude Ntsame Edjo (2010/2015, CRIRES-Université Laval) ; réforme des curricula en cours depuis 2022 | à valider |
| (futur) autres programmes | Chapitres des autres unités | Cadrage, « Découpage des cours », base francophone générique | à valider (pas encore importés) |

## Règle d'or

La source de vérité est le **programme officiel du ministère** (IPN), validé par des enseignants locaux. Ce pack ne doit jamais servir de base par défaut pour un autre pays.
