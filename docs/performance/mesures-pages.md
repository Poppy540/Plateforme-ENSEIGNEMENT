# Mesures des pages en faible débit

Produit par `pnpm mesurer:pages` le 2026-11-02 (commit c727a48), sur téléphone simulé (Pixel 7), données fictives, serveur de production local.

- **Premier chargement** : octets réellement passés par le réseau (compressés), téléphone sans rien en mémoire, préchargements des pages liées compris. Vidéo exclue.
- **Navigation** : octets passés par le réseau quand la page est rouverte, les fichiers statiques étant déjà sur le téléphone (cache et service worker).
- **Réseaux simulés** : 3G lente (400 kbit/s, 400 ms) et 2G (250 kbit/s, 600 ms), processeur ralenti 4 fois. « Affichage » : premier contenu visible ; « utilisable » : page chargée, scripts exécutés.

## Visiteur (sans compte)

| Page | Chemin | Premier chargement (Ko) | dont scripts | dont document | dont données préchargées | Navigation (Ko) | 3G lente : affichage | 3G lente : utilisable | 2G : affichage | 2G : utilisable |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Accueil | `/` | 145 | 139 | 3 | 0 | 5 | 1,1 s | 4,0 s | 1,4 s | 6,1 s |
| Connexion | `/connexion` | 147 | 141 | 3 | 0 | 1 | 0,9 s | 4,0 s | 1,4 s | 6,3 s |
| Aide | `/aide` | 151 | 140 | 5 | 3 | 7 | 1,0 s | 4,1 s | 1,4 s | 6,2 s |
| Pas de connexion | `/hors-ligne` | 147 | 141 | 3 | 0 | 4 | 1,0 s | 4,1 s | 1,4 s | 6,3 s |
| Saisie du code | `/connexion/code` | 148 | 140 | 4 | 1 | 4 | 1,0 s | 4,0 s | 1,4 s | 6,3 s |

## Élève

| Page | Chemin | Premier chargement (Ko) | dont scripts | dont document | dont données préchargées | Navigation (Ko) | 3G lente : affichage | 3G lente : utilisable | 2G : affichage | 2G : utilisable |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Espace de l'élève | `/espace` | 148 | 141 | 4 | 0 | 1 | 1,0 s | 4,1 s | 1,4 s | 6,3 s |
| Mes cours | `/catalogue` | 149 | 141 | 4 | 0 | 2 | 0,9 s | 4,1 s | 1,4 s | 6,3 s |
| Chapitres d'une matière | `/catalogue/ga-5e-mathematiques` | 148 | 141 | 3 | 1 | 0 | 0,9 s | 4,1 s | 1,4 s | 6,4 s |
| Chapitre | `/catalogue/ga-5e-mathematiques/fractions-operations` | 152 | 144 | 4 | 1 | 3 | 0,9 s | 4,1 s | 1,4 s | 6,4 s |
| Quiz | `/catalogue/ga-5e-mathematiques/fractions-operations/quiz` | 150 | 142 | 4 | 1 | 1 | 0,9 s | 4,1 s | 1,6 s | 6,4 s |
| Plan de révision | `/espace/plan` | 150 | 142 | 5 | 1 | 5 | 1,0 s | 4,1 s | 1,4 s | 6,3 s |
| Mes données | `/espace/mes-donnees` | 148 | 140 | 4 | 1 | 7 | 0,9 s | 4,1 s | 1,5 s | 6,3 s |
| Questionnaire | `/espace/questionnaire` | 148 | 140 | 3 | 2 | 4 | 1,0 s | 4,0 s | 1,4 s | 6,2 s |
| Inscription | `/inscription` | 148 | 140 | 4 | 0 | 6 | 1,0 s | 4,0 s | 1,4 s | 6,3 s |

## Parent (lien reçu, sans compte)

| Page | Chemin | Premier chargement (Ko) | dont scripts | dont document | dont données préchargées | Navigation (Ko) | 3G lente : affichage | 3G lente : utilisable | 2G : affichage | 2G : utilisable |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Accord pour les rapports | `/parent/rapports/accord?jeton=…` | 146 | 139 | 4 | 0 | 4 | 0,9 s | 4,0 s | 1,6 s | 6,2 s |
| Rapport hebdomadaire | `/parent/rapport?jeton=…` | 148 | 141 | 4 | 0 | 5 | 1,0 s | 4,1 s | 1,5 s | 6,4 s |
| Accord d'inscription | `/parent/confirmer?jeton=…` | 146 | 139 | 4 | 0 | 4 | 1,2 s | 4,1 s | 1,6 s | 6,3 s |

## Enseignant

| Page | Chemin | Premier chargement (Ko) | dont scripts | dont document | dont données préchargées | Navigation (Ko) | 3G lente : affichage | 3G lente : utilisable | 2G : affichage | 2G : utilisable |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Activation | `/enseignant/activer` | 147 | 141 | 4 | 0 | 4 | 0,9 s | 4,0 s | 1,4 s | 6,3 s |
| Vue de la classe | `/enseignant` | 148 | 140 | 4 | 1 | 5 | 0,9 s | 4,1 s | 1,4 s | 6,3 s |

## Référent

| Page | Chemin | Premier chargement (Ko) | dont scripts | dont document | dont données préchargées | Navigation (Ko) | 3G lente : affichage | 3G lente : utilisable | 2G : affichage | 2G : utilisable |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Espace du référent | `/referent` | 156 | 141 | 12 | 0 | 14 | 1,0 s | 4,0 s | 1,6 s | 6,2 s |
| Accueil du référent | `/referent/accueil` | 147 | 139 | 5 | 0 | 5 | 1,0 s | 4,0 s | 1,4 s | 6,2 s |
| Chapitre à relire | `/referent/chapitres/…` | 149 | 141 | 6 | 0 | 7 | 1,0 s | 4,0 s | 1,4 s | 6,3 s |
| Quiz à relire | `/referent/quiz/…` | 150 | 140 | 6 | 1 | 6 | 1,0 s | 4,0 s | 1,4 s | 6,2 s |
| Script à relire | `/referent/scripts/…` | 151 | 141 | 6 | 2 | 8 | 1,0 s | 4,0 s | 1,4 s | 6,2 s |
| Liens de prérequis | `/referent/prerequis` | 151 | 139 | 9 | 0 | 12 | 0,9 s | 4,0 s | 1,5 s | 6,2 s |
| Conformité | `/referent/conformite` | 147 | 140 | 4 | 0 | 5 | 1,0 s | 4,1 s | 1,4 s | 6,2 s |

## Administration

| Page | Chemin | Premier chargement (Ko) | dont scripts | dont document | dont données préchargées | Navigation (Ko) | 3G lente : affichage | 3G lente : utilisable | 2G : affichage | 2G : utilisable |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Tableau de l'administration | `/administration` | 152 | 140 | 8 | 0 | 10 | 1,0 s | 4,1 s | 1,5 s | 6,4 s |
| Tableau de bord du pilote | `/administration/tableau-de-bord` | 149 | 139 | 4 | 3 | 5 | 0,9 s | 4,1 s | 1,4 s | 6,1 s |
| Ce qui vous attend | `/administration/attentes` | 153 | 139 | 8 | 2 | 9 | 1,0 s | 4,0 s | 1,4 s | 6,3 s |
| Conditions du pilote | `/administration/conditions` | 151 | 139 | 8 | 1 | 9 | 0,9 s | 4,0 s | 1,5 s | 6,2 s |
| Chapitres du pilote | `/administration/pilote` | 149 | 139 | 6 | 1 | 7 | 0,9 s | 4,1 s | 1,4 s | 6,2 s |
| Classes du pilote | `/administration/classes` | 150 | 141 | 6 | 1 | 6 | 0,9 s | 4,0 s | 1,4 s | 6,2 s |
| Inviter un référent | `/administration/invitations` | 150 | 140 | 5 | 2 | 6 | 0,9 s | 4,1 s | 1,5 s | 6,3 s |
| Critères de suspension | `/administration/criteres` | 150 | 139 | 7 | 1 | 7 | 1,1 s | 4,1 s | 1,4 s | 6,2 s |
| Semaine du pilote | `/administration/semaine` | 149 | 139 | 6 | 1 | 7 | 1,0 s | 4,1 s | 1,4 s | 6,2 s |
| Journal du pilote | `/administration/journal` | 148 | 139 | 5 | 1 | 6 | 0,9 s | 4,0 s | 1,4 s | 6,2 s |
| Rapport de fin | `/administration/fin-pilote` | 147 | 139 | 4 | 1 | 4 | 1,0 s | 4,0 s | 1,4 s | 6,2 s |
| Clôture | `/administration/cloture` | 148 | 139 | 6 | 0 | 7 | 1,0 s | 4,1 s | 1,4 s | 6,2 s |
| Sort des données | `/administration/donnees` | 148 | 139 | 4 | 2 | 5 | 0,9 s | 4,2 s | 1,4 s | 6,2 s |
| Pilotage | `/administration/exploitation` | 148 | 139 | 6 | 0 | 6 | 1,0 s | 4,0 s | 1,6 s | 6,3 s |
| Recrutement | `/administration/recrutement` | 149 | 141 | 5 | 0 | 8 | 0,9 s | 4,0 s | 1,4 s | 6,3 s |

## Pages non mesurées

| Public | Chemin | Raison |
| --- | --- | --- |
| Visiteur (sans compte) | `/indisponible` | affichée seulement quand l'accès des élèves est fermé ; même gabarit que « Pas de connexion » |
| Référent | `/referent/activer` | même gabarit que l'activation de l'enseignant |
| Référent | `/referent/videos/[id]` | aucune vidéo fictive (fournisseur vidéo non choisi) |
| Référent | `/referent/conformite/[id]` | demande un document officiel déposé |
| Référent | `/referent/coordinateur/[id]` | demande un rapport du Coordinateur |
| Administration | `/administration/recrutement/[id]` | demande une fiche candidat |
