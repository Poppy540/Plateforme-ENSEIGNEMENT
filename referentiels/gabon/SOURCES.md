# Sources du pack Gabon

Statuts : **validé** (confirmé par un enseignant-référent sur le programme officiel) · **à valider** (provisoire) · **manquant**.

À ce jour, **aucune donnée n'est validée** : aucun enseignant-référent n'est recruté et les programmes officiels de l'IPN n'ont pas été obtenus.

| Fichier | Donnée | Origine | Statut |
|---|---|---|---|
| `pays.yaml` | Langue, monnaie, fuseau, moyens de paiement | Cadrage (connaissances générales) | à valider |
| `pays.yaml` | Durées de conservation (365 / 30 / 730 jours) | Proposition de Claude Code (ADR 0019) | à valider par un juriste |
| `pays.yaml` | Âge de la majorité | — (inconnu : tout élève traité comme mineur) | manquant, à vérifier par un juriste |
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
| `agents/evaluateur/ga-3e-mathematiques.yaml` | Variables du prompt Évaluateur | Cadrage, Partie B et profils de niveau ; référent provisoire (Claude Code) | à valider |
| `agents/production-video/ga-3e-mathematiques.yaml` | Fiche de l'avatar (synthétique) | Proposition de Claude Code, fournisseur non choisi | à valider par le propriétaire |
| `faq.yaml` | FAQ du Support (9 entrées), délai de réponse des tickets | Rédigée par Claude Code d'après le fonctionnement de la plateforme ; délai non fixé | à valider par le propriétaire |
| `agents/support/pays.yaml` | Variables du prompt Support | Proposition de Claude Code | à valider |
| `agents/tuteur/pays.yaml` | Variables du prompt Tuteur | Proposition de Claude Code | à valider |
| `agents/scenariste/ga-3e-mathematiques.yaml` | Variables du prompt Scénariste | Cadrage, Partie B et profils de niveau ; persona et référent provisoires (Claude Code) | à valider |
| (futur) Histoire-Géographie 6e | Intitulés | Programmes IPN 1993/1996, via l'étude Ntsame Edjo (2010/2015, CRIRES-Université Laval) ; réforme des curricula en cours depuis 2022 | à valider |
| `programmes/ga-6e-mathematiques.yaml`, `ga-5e-…`, `ga-4e-…` | 17, 8 et 8 chapitres de Maths (intitulés repris mot pour mot) | Cadrage, « Découpage des cours », base francophone générique (ADR 0035) | à valider |
| `programmes/ga-6e-…`, `ga-5e-…`, `ga-4e-mathematiques.yaml` | Volumes horaires, coefficients | — | manquant |
| `prerequis/mathematiques.yaml` | 44 liens de prérequis chapitre par chapitre, 6e → 3e (strict / souple) | Proposition de Claude Code d'après les programmes provisoires (ADR 0037) | chaque lien à valider par un référent dans l'espace référent |
| `agents/{professeur,scenariste,evaluateur,production-video}/ga-{6e,5e,4e}-mathematiques.yaml` | Variables des prompts et fiche d'avatar | Valeurs de l'unité pilote adaptées au niveau d'après `profils-niveau.yaml` (Claude Code) | à valider |
| `agents/coordinateur/<famille>.yaml` (6 familles) | Variables du prompt Coordinateur et skill de famille | Proposition de Claude Code (ADR 0038) | à valider |
| `agents/conformite/pays.yaml` | Variables du prompt Conformité programme | Proposition de Claude Code (ADR 0039) | à valider |
| `agents/recruteur/pays.yaml` | Variables du prompt Recruteur | Proposition de Claude Code (ADR 0040) | à valider |
| `recrutement.yaml` | Sources autorisées, canaux, délai de relance, modèles et FAQ de recrutement ; conditions non fixées (`null`) | Proposition de Claude Code d'après le cadrage, Parties E et F (ADR 0040) | à valider ; aucun usage réel avant l'avis du juriste |
| (futur) autres programmes | Chapitres des autres unités | Cadrage, « Découpage des cours », base francophone générique | à valider (pas encore importés) |

## Règle d'or

La source de vérité est le **programme officiel du ministère** (IPN), validé par des enseignants locaux. Ce pack ne doit jamais servir de base par défaut pour un autre pays.
