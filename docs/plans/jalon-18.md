# Plan du Jalon 18 — faible débit

**Statut** : validé par le propriétaire le 2026-10-30 (piste choisie, ADR 0098). Rien d'autre n'est commencé.

**Objectif** : au Gabon, la plupart des élèves se connecteront depuis un téléphone d'entrée de gamme, avec une connexion lente, chère et coupée par moments. Ce qui existe déjà (ADR 0044) :

- un budget de 200 Ko par page ;
- un temps d'affichage limite pour la page de connexion ;
- la lecture hors ligne des chapitres déjà ouverts.

Mais ces contrôles ne portent que sur **cinq pages publiques**. Depuis, de nombreuses pages ont été ajoutées : espace de l'élève, quiz, plan de révision, rapports et questionnaire des parents, vue de l'enseignant, espace du référent.

Le Jalon 18 mesure le poids et la vitesse réels de **toutes** ces pages en conditions difficiles, fixe un budget pour chacune, le fait vérifier par `pnpm controler`, allège ce qui dépasse et étend la lecture hors ligne. **Rien n'est déployé ni souscrit.**

**Principes inchangés** :

- données fictives seulement ;
- aucun secret lu ni affiché ;
- aucun prompt d'agent modifié ;
- aucune dépendance nouvelle sans accord ;
- tout ce qui touche aux données gardées sur le téléphone d'un élève mineur passe par vous.

## Étapes (dans cet ordre)

| #   | Étape                     | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Besoin du propriétaire           |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| 0   | Plan                      | Ce plan, l'ADR 0098 et `memory.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Validation (faite)               |
| 1   | Mesure                    | Inventaire de toutes les pages, par public : élève, parent, enseignant, référent, administration. Pour chacune, on mesure le poids transféré au premier chargement et en navigation, puis le temps avant que la page soit utilisable sur deux réseaux simulés : « 3G lente » (400 kbit/s, 400 ms) et « 2G » (250 kbit/s, 600 ms). Le processeur est ralenti quatre fois, comme sur un téléphone d'entrée de gamme. Le résultat va dans `docs/performance/mesures-jalon-18.md` : ce qui pèse (scripts, styles, polices, données), les pages qui dépassent et la cause probable. | —                                |
| 2   | Budgets vérifiés          | Un budget de poids et de temps par public, tiré des mesures. Les pages des élèves et des parents restent les plus strictes : 200 Ko au premier chargement, comme aujourd'hui. Les budgets sont vérifiés par les tests de bout en bout, donc par `pnpm controler`. Une page nouvelle sans budget fait échouer les tests, comme les garde-fous du Jalon 16.                                                                                                                                                                                                                      | —                                |
| 3   | Allègement                | Correction des pages qui dépassent : code envoyé au navigateur sans nécessité, composants à rendre côté serveur, polices, images, données en trop dans la page, en-têtes de cache et compression. Chaque gain est mesuré avant et après.                                                                                                                                                                                                                                                                                                                                       | —                                |
| 4   | Hors ligne étendu         | Lire sans réseau ce qu'un élève a déjà ouvert, au-delà des chapitres : « Mes cours », plan de révision, résultat des derniers quiz. Indication claire « hors ligne, copie du … ». Mêmes règles de cloisonnement qu'aujourd'hui : une copie par personne, effacée à la déconnexion ou au changement de personne. **Décision D14** : ce que la plateforme peut garder sur un téléphone, souvent partagé, d'un élève mineur. Les choix vous sont présentés avec une recommandation ; les quiz ne se passent jamais hors ligne sans votre accord.                                  | Choix D14                        |
| 5   | Passages réels des agents | Repris des Jalons 11 à 17 : dès que la clé, la relecture des skills et l'accord sont là, mini-essais, puis séries complètes (~121 USD) après un nouvel accord.                                                                                                                                                                                                                                                                                                                                                                                                                 | Clé API ; accord sur chaque coût |
| 6   | Bilan                     | Bilan comme aux jalons précédents, avec les mesures avant et après et des captures sur téléphone simulé (pages hors ligne, indication de copie).                                                                                                                                                                                                                                                                                                                                                                                                                               | —                                |

L'étape 5 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-10-30)

1. **Piste retenue** : faible débit.
2. **Écartés pour ce jalon** :
   - la preuve d'exportabilité ;
   - une nouvelle matière de 3e ;
   - l'accueil des premiers humains.

## Hors Jalon 18

- Les vidéos hors ligne : elles dépendent du fournisseur vidéo, pas encore choisi.
- Une skill « faible débit » pour les agents (réponses plus courtes) : elle demanderait une relecture de plus avant les essais réels.
- Un essai sur de vrais téléphones au Gabon : avec l'établissement, pendant le pilote.
