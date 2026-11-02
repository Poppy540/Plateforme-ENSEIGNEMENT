# Séance de prise en main du référent (environ 45 minutes)

**Pour** : le propriétaire, qui mène la séance avec le premier référent. **Où** : en personne ou en visioconférence avec partage d'écran. **Sur quoi** : un **espace d'entraînement** sur votre ordinateur, avec des données fictives. Le site réel n'est pas touché et aucun élève n'est concerné.

## Avant la séance (10 minutes, la veille)

1. Dans `application/`, préparez la base locale et l'espace d'entraînement :

   ```
   bash scripts/base-locale.sh reinitialiser
   pnpm entrainement:referent
   ```

   La commande affiche un **code d'invitation d'entraînement**, valable 1 jour. Elle refuse toute base qui n'est pas sur votre ordinateur.

2. Lancez le site local, comme la commande l'indique, puis ouvrez `http://localhost:3000` sur votre écran partagé.
3. Imprimez ou envoyez l'[aide-mémoire](aide-memoire.md), après avoir complété la partie « Qui appeler ».
4. Prévoyez le programme officiel de 3e (Mathématiques) sous forme papier ou PDF : le référent compare les chapitres avec lui.

## Déroulé

| Temps     | Quoi                                                                                                                                                           | Ce que fait le référent                                              |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 0-5 min   | Le rôle, en une phrase : « rien n'arrive aux élèves sans votre validation ». Ce qu'il voit (les contenus de sa famille) et ce qu'il ne voit pas (aucun élève). | Écoute ; pose ses questions                                          |
| 5-10 min  | Connexion avec un numéro fictif (`+999 …`) et le code `123456`, puis activation avec le code d'entraînement                                                    | Active son accès, lit l'accueil                                      |
| 10-20 min | **Exercice 1** : un chapitre de 3e. Il le compare au programme officiel, en **rejette** un (commentaire précis), en **valide** un autre                        | Valide et rejette ; constate qu'un rejet sans commentaire est refusé |
| 20-30 min | **Exercice 2** : sur le chapitre validé, il demande un quiz brouillon et un brouillon de script, puis relit le quiz et valide                                  | Relit chaque question ; coche la vérification                        |
| 30-38 min | **Exercice 3** : le script. Il trouve les points [À VÉRIFIER] et **demande une révision** avec une consigne                                                    | Repère les points jaunes ; écrit une consigne                        |
| 38-42 min | Liens de prérequis : en valider un, en rejeter un avec une remarque                                                                                            | Valide et rejette                                                    |
| 42-45 min | Questions ; rappel des « Jamais » de l'aide-mémoire ; la suite (son code d'invitation réel, les chapitres du pilote)                                           | Garde l'aide-mémoire                                                 |

Dans l'espace d'entraînement, les agents sont **simulés** : leurs textes portent la mention « (simulé) ». On s'exerce aux gestes, pas au fond. Sur le site réel, les brouillons seront de vrais textes à relire avec soin.

## Questions fréquentes

- **« Et si je valide par erreur ? »** Prévenez le propriétaire. Une nouvelle version peut remplacer le contenu ; la décision reste tracée.
- **« Combien de temps par chapitre ? »** Les temps indiqués sur l'accueil sont des estimations, à ajuster ensemble après les premiers chapitres.
- **« Puis-je modifier le texte moi-même ? »** Non. Toute correction passe par une nouvelle version (demande de révision ou rejet commenté), que vous relisez à son tour.
- **« Vais-je voir les élèves ? »** Non : ni noms, ni messages, ni réponses. Seulement des statistiques de quiz anonymes, à partir de 5 tentatives.
- **« Qui est responsable d'une erreur ? »** La question est posée au juriste (Q13). En attendant : lire avant de valider, rejeter en cas de doute.

## Après la séance

- Effacez l'espace d'entraînement : `bash scripts/base-locale.sh reinitialiser`.
- Créez la **vraie invitation** du référent sur le site réel (« Inviter un référent » dans l'administration), une fois Q14 tranchée par le juriste. Transmettez-lui le code par un canal sûr.
