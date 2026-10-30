# Mesures des pages en faible débit

Produit par `pnpm mesurer:pages` le 2026-10-30 (commit b8729ca), sur téléphone simulé (Pixel 7), données fictives, serveur de production local.

- **Premier chargement** : octets réellement passés par le réseau (compressés), téléphone sans rien en mémoire, préchargements des pages liées compris. Vidéo exclue.
- **Navigation** : octets passés par le réseau quand la page est rouverte, les fichiers statiques étant déjà sur le téléphone (cache et service worker).
- **Réseaux simulés** : 3G lente (400 kbit/s, 400 ms) et 2G (250 kbit/s, 600 ms), processeur ralenti 4 fois. « Affichage » : premier contenu visible ; « utilisable » : page chargée, scripts exécutés.

## Visiteur (sans compte)

| Page             | Chemin            | Premier chargement (Ko) | dont scripts | dont document | dont données préchargées | Navigation (Ko) | 3G lente : affichage | 3G lente : utilisable | 2G : affichage | 2G : utilisable |
| ---------------- | ----------------- | ----------------------: | -----------: | ------------: | -----------------------: | --------------: | -------------------: | --------------------: | -------------: | --------------: |
| Accueil          | `/`               |                     146 |          139 |             3 |                        1 |               5 |                1,0 s |                 4,1 s |          1,4 s |           6,2 s |
| Connexion        | `/connexion`      |                     147 |          141 |             3 |                        0 |               1 |                1,1 s |                 4,1 s |          1,4 s |           6,3 s |
| Aide             | `/aide`           |                     148 |          140 |             5 |                        0 |               6 |                0,9 s |                 4,0 s |          1,4 s |           6,2 s |
| Pas de connexion | `/hors-ligne`     |                     147 |          141 |             3 |                        0 |               4 |                1,1 s |                 4,1 s |          1,4 s |           6,3 s |
| Saisie du code   | `/connexion/code` |                     147 |          140 |             4 |                        1 |               5 |                0,9 s |                 4,0 s |          1,4 s |           6,3 s |

## Élève

| Page                    | Chemin                                        | Premier chargement (Ko) | dont scripts | dont document | dont données préchargées | Navigation (Ko) | 3G lente : affichage | 3G lente : utilisable | 2G : affichage | 2G : utilisable |
| ----------------------- | --------------------------------------------- | ----------------------: | -----------: | ------------: | -----------------------: | --------------: | -------------------: | --------------------: | -------------: | --------------: |
| Espace de l'élève       | `/espace`                                     |                     148 |          141 |             4 |                        0 |               3 |                0,9 s |                 4,2 s |          1,4 s |           6,3 s |
| Mes cours               | `/catalogue`                                  |                     149 |          141 |             4 |                        1 |               0 |                0,9 s |                 4,1 s |          1,4 s |           6,2 s |
| Chapitres d'une matière | `/catalogue/ga-6e-mathematiques`              |                     148 |          141 |             3 |                        0 |               1 |                0,9 s |                 4,2 s |          1,4 s |           6,3 s |
| Chapitre                | `/catalogue/ga-6e-mathematiques/entiers`      |                     151 |          144 |             4 |                        1 |               1 |                0,9 s |                 4,1 s |          1,4 s |           6,4 s |
| Quiz                    | `/catalogue/ga-6e-mathematiques/entiers/quiz` |                     151 |          142 |             4 |                        2 |               0 |                1,0 s |                 4,2 s |          1,5 s |           6,4 s |
| Plan de révision        | `/espace/plan`                                |                     149 |          141 |             5 |                        1 |               6 |                0,9 s |                 4,0 s |          1,5 s |           6,3 s |
| Mes données             | `/espace/mes-donnees`                         |                     148 |          140 |             4 |                        1 |               5 |                1,0 s |                 4,0 s |          1,4 s |           6,3 s |
| Questionnaire           | `/espace/questionnaire`                       |                     147 |          140 |             3 |                        1 |               4 |                0,9 s |                 4,1 s |          1,4 s |           6,3 s |
| Inscription             | `/inscription`                                |                     148 |          140 |             4 |                        1 |               5 |                0,9 s |                 4,0 s |          1,4 s |           6,2 s |

## Parent (lien reçu, sans compte)

| Page                     | Chemin                            | Premier chargement (Ko) | dont scripts | dont document | dont données préchargées | Navigation (Ko) | 3G lente : affichage | 3G lente : utilisable | 2G : affichage | 2G : utilisable |
| ------------------------ | --------------------------------- | ----------------------: | -----------: | ------------: | -----------------------: | --------------: | -------------------: | --------------------: | -------------: | --------------: |
| Accord pour les rapports | `/parent/rapports/accord?jeton=…` |                     146 |          139 |             4 |                        0 |               4 |                0,9 s |                 4,1 s |          1,4 s |           6,2 s |
| Rapport hebdomadaire     | `/parent/rapport?jeton=…`         |                     148 |          141 |             4 |                        0 |               5 |                0,9 s |                 4,0 s |          1,4 s |           6,4 s |
| Accord d'inscription     | `/parent/confirmer?jeton=…`       |                     146 |          139 |             4 |                        0 |               4 |                0,9 s |                 4,0 s |          1,6 s |           6,2 s |

## Enseignant

| Page             | Chemin                | Premier chargement (Ko) | dont scripts | dont document | dont données préchargées | Navigation (Ko) | 3G lente : affichage | 3G lente : utilisable | 2G : affichage | 2G : utilisable |
| ---------------- | --------------------- | ----------------------: | -----------: | ------------: | -----------------------: | --------------: | -------------------: | --------------------: | -------------: | --------------: |
| Activation       | `/enseignant/activer` |                     147 |          141 |             4 |                        0 |               4 |                0,9 s |                 4,1 s |          1,4 s |           6,2 s |
| Vue de la classe | `/enseignant`         |                     147 |          140 |             4 |                        0 |               5 |                1,0 s |                 4,1 s |          1,4 s |           6,2 s |

## Référent

| Page                | Chemin                  | Premier chargement (Ko) | dont scripts | dont document | dont données préchargées | Navigation (Ko) | 3G lente : affichage | 3G lente : utilisable | 2G : affichage | 2G : utilisable |
| ------------------- | ----------------------- | ----------------------: | -----------: | ------------: | -----------------------: | --------------: | -------------------: | --------------------: | -------------: | --------------: |
| Espace du référent  | `/referent`             |                     158 |          141 |            12 |                        2 |              13 |                1,0 s |                 4,1 s |          1,4 s |           6,2 s |
| Accueil du référent | `/referent/accueil`     |                     147 |          139 |             5 |                        0 |               5 |                1,0 s |                 4,0 s |          1,4 s |           6,2 s |
| Chapitre à relire   | `/referent/chapitres/…` |                     150 |          141 |             5 |                        1 |               7 |                0,9 s |                 4,0 s |          1,4 s |           6,3 s |
| Quiz à relire       | `/referent/quiz/…`      |                     150 |          140 |             6 |                        1 |               7 |                1,0 s |                 4,1 s |          1,4 s |           6,3 s |
| Script à relire     | `/referent/scripts/…`   |                     150 |          141 |             6 |                        1 |               8 |                0,9 s |                 4,0 s |          1,5 s |           6,3 s |
| Liens de prérequis  | `/referent/prerequis`   |                     157 |          139 |             9 |                        6 |              10 |                0,9 s |                 4,0 s |          1,5 s |           6,3 s |
| Conformité          | `/referent/conformite`  |                     148 |          140 |             4 |                        1 |               5 |                1,0 s |                 4,1 s |          1,4 s |           6,3 s |

## Administration

| Page                        | Chemin                            | Premier chargement (Ko) | dont scripts | dont document | dont données préchargées | Navigation (Ko) | 3G lente : affichage | 3G lente : utilisable | 2G : affichage | 2G : utilisable |
| --------------------------- | --------------------------------- | ----------------------: | -----------: | ------------: | -----------------------: | --------------: | -------------------: | --------------------: | -------------: | --------------: |
| Tableau de l'administration | `/administration`                 |                     155 |          140 |             9 |                        3 |              10 |                1,0 s |                 4,0 s |          1,4 s |           6,2 s |
| Tableau de bord du pilote   | `/administration/tableau-de-bord` |                     147 |          139 |             4 |                        1 |               5 |                0,9 s |                 4,0 s |          1,5 s |           6,2 s |
| Ce qui vous attend          | `/administration/attentes`        |                     151 |          139 |             8 |                        1 |              11 |                0,9 s |                 4,1 s |          1,4 s |           6,2 s |
| Conditions du pilote        | `/administration/conditions`      |                     151 |          139 |             8 |                        1 |              10 |                1,0 s |                 4,0 s |          1,4 s |           6,2 s |
| Chapitres du pilote         | `/administration/pilote`          |                     148 |          139 |             6 |                        0 |               7 |                1,0 s |                 4,0 s |          1,4 s |           6,2 s |
| Classes du pilote           | `/administration/classes`         |                     150 |          141 |             6 |                        1 |               7 |                0,9 s |                 4,0 s |          1,4 s |           6,2 s |
| Inviter un référent         | `/administration/invitations`     |                     148 |          140 |             5 |                        1 |               6 |                1,0 s |                 4,0 s |          1,5 s |           6,2 s |
| Critères de suspension      | `/administration/criteres`        |                     150 |          139 |             7 |                        1 |               7 |                1,0 s |                 4,0 s |          1,4 s |           6,2 s |
| Semaine du pilote           | `/administration/semaine`         |                     149 |          139 |             6 |                        1 |               7 |                1,0 s |                 4,0 s |          1,5 s |           6,2 s |
| Journal du pilote           | `/administration/journal`         |                     148 |          139 |             5 |                        1 |               6 |                0,9 s |                 4,0 s |          1,4 s |           6,2 s |
| Rapport de fin              | `/administration/fin-pilote`      |                     148 |          139 |             4 |                        2 |               6 |                1,0 s |                 4,1 s |          1,4 s |           6,2 s |
| Clôture                     | `/administration/cloture`         |                     150 |          139 |             6 |                        1 |               8 |                1,0 s |                 4,0 s |          1,6 s |           6,2 s |
| Sort des données            | `/administration/donnees`         |                     147 |          139 |             4 |                        1 |               7 |                0,9 s |                 4,0 s |          1,4 s |           6,2 s |
| Pilotage                    | `/administration/exploitation`    |                     149 |          139 |             6 |                        1 |               7 |                1,0 s |                 4,0 s |          1,5 s |           6,3 s |
| Recrutement                 | `/administration/recrutement`     |                     150 |          141 |             5 |                        1 |               8 |                1,0 s |                 4,0 s |          1,5 s |           6,2 s |

## Pages non mesurées

| Public                 | Chemin                          | Raison                                                                                        |
| ---------------------- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| Référent               | `/referent/videos/…`            | aucune vidéo fictive (fournisseur vidéo non choisi)                                           |
| Référent               | `/referent/conformite/…`        | demande un document officiel déposé                                                           |
| Référent               | `/referent/coordinateur/…`      | demande un rapport du Coordinateur                                                            |
| Visiteur (sans compte) | `/indisponible`                 | affichée seulement quand l'accès des élèves est fermé ; même gabarit que « Pas de connexion » |
| Référent               | `/referent/activer`             | même gabarit que l'activation de l'enseignant                                                 |
| Administration         | `/administration/recrutement/…` | demande une fiche candidat                                                                    |
