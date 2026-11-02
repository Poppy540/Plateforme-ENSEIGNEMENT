# Bilan du Jalon 19

**Date** : 2026-11-02 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; agents, messagerie et vidéo **simulés** ; rien n'est déployé, souscrit ni envoyé ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0102) : préparer l'arrivée des premières personnes réelles (juriste, référent, enseignant, établissement), pour que chacune puisse commencer sans attendre ni se perdre.

| Étape du plan                | État           | Remarque                                                                                                                         |
| ---------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1. Dossier du juriste        | **Faite**      | Version 4 relue et republiée ; « ce qui a changé » ; 20 questions classées par priorité ; lettre d'envoi à compléter et signer.  |
| 2. Kit du référent           | **Faite**      | Aide-mémoire d'une page, guide pas à pas avec 10 captures, séance de prise en main de 45 min sur un espace d'entraînement local. |
| 3. Journée d'ouverture       | **Faite**      | Répétée à chaque contrôle avec 30 élèves fictifs ; liste du jour J ; fiche élève d'une page.                                     |
| 4. Passages réels des agents | **En attente** | Clé API, relecture des deux skills, accord sur le coût (~121 USD).                                                               |
| 5. Bilan                     | **Fait**       | 3 captures ; ce document.                                                                                                        |

**Le Jalon 19 sera clos** quand les passages réels auront atteint les seuils (étape 4, reprise des jalons précédents).

## 2. Ce qui est prêt pour chacun

| Pour                            | Document                                                                    | Où                                                                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Le juriste                      | Dossier version 4, questions par priorité, lettre d'envoi                   | [`docs/juridique/`](../juridique/) ; page partagée : https://claude.ai/artifact/XbZxU3ebnvJKcbyg11uGsD (privée tant que vous ne la partagez pas) |
| Le référent                     | Aide-mémoire, guide avec captures, séance de prise en main                  | [`docs/pilote/kit-referent/`](../pilote/kit-referent/README.md)                                                                                  |
| L'enseignant et l'établissement | Liste du jour J                                                             | [`docs/pilote/journee-ouverture.md`](../pilote/journee-ouverture.md)                                                                             |
| Les élèves                      | Fiche « comment me connecter »                                              | [`docs/pilote/fiche-eleve.md`](../pilote/fiche-eleve.md)                                                                                         |
| Vous                            | Espace d'entraînement (`pnpm entrainement:referent`, base locale seulement) | `application/`                                                                                                                                   |

## 3. Constats

- **L'accord du parent est le point fragile de la journée d'ouverture.** Tant que le parent n'a pas accepté le lien reçu par SMS, l'élève ne peut rien faire. D'où la règle de la liste du jour J : inscriptions et accords **avant** la séance.
- **« Commencé » reste à 0 dans la vue de l'enseignant** alors que les élèves ont ouvert le chapitre et passé le quiz (capture 02). Seul le professeur IA enregistre la progression, quand l'élève lui pose une question. Un élève qui lit et fait le quiz sans poser de question n'apparaît pas comme ayant commencé. Le chiffre trompe l'enseignant. Changer la règle touche à ce que les agents écrivent : c'est la **décision D15** proposée au §7. Rien n'est modifié en attendant.
- **Un chapitre de test peut en gêner un autre.** Les deux premiers chapitres choisis pour la répétition servaient déjà à d'autres tests (« non validé » pour l'un, cité par son titre pour l'autre) ; trois tests ont échoué. La répétition utilise maintenant un chapitre qu'aucun test ne cite, et la règle est notée pour les prochains tests.
- **Le dossier en ligne du juriste était resté à la version du Jalon 9**, sans T12, R11 ni Q20 ; il est maintenant à jour.

## 4. Démonstration (captures sur téléphone, données fictives)

Index et commande de régénération : [`docs/demo/jalon-19/README.md`](../demo/jalon-19/README.md). Kit du référent : [10 captures](../pilote/kit-referent/README.md).

|     | Écran                                                                                               |
| --- | --------------------------------------------------------------------------------------------------- |
| 01  | [L'élève dans sa classe](../demo/jalon-19/01-eleve-dans-sa-classe.png)                              |
| 02  | [L'enseignant : chiffres d'ensemble](../demo/jalon-19/02-enseignant-chiffres-de-la-classe.png)      |
| 03  | [L'administration : classe complète](../demo/jalon-19/03-administration-alerte-classe-complete.png) |

## 5. Ce que vérifient les tests

Dernier contrôle complet (`pnpm controler`) : **9 / 9 réussis**.

| Série                                                                                             | Nombre           | Commande              |
| ------------------------------------------------------------------------------------------------- | ---------------- | --------------------- |
| Tests unitaires (dont le garde-fou « base locale seulement » de l'espace d'entraînement)          | 330, tous passés | `pnpm test`           |
| Bout en bout (dont la journée d'ouverture : 30 élèves, classe pleine au 31e, vue de l'enseignant) | 122, tous passés | `pnpm test:e2e`       |
| Base, migrations, sauvegarde, répétition générale                                                 | Passés           | dans `pnpm controler` |

## 6. Coûts

| Poste                                           | Estimation                        | Statut                                                    |
| ----------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| Passages réels complets de toutes les batteries | ~121 USD                          | Non lancés : clé, relecture des skills et accord attendus |
| Dépenses du jalon                               | 0 USD ; aucune dépendance ajoutée | —                                                         |

## 7. Décisions et actions attendues du propriétaire

**Nouvelle décision proposée, D15 : quand un chapitre compte-t-il comme « commencé » ?**

| Choix                                                               | Effet                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a. Dès que l'élève ouvre la leçon ou passe le quiz (recommandé)** | La plateforme enregistre « commencé » elle-même, sans agent. L'enseignant voit un chiffre juste. Aucune donnée nouvelle : le chapitre ouvert est déjà compté, sans l'élève, dans les mesures du pilote. |
| b. Seulement quand le professeur IA l'enregistre                    | Règle actuelle : le chiffre reste trompeur pour un élève qui travaille seul.                                                                                                                            |
| c. Retirer « Commencé » de la vue de l'enseignant                   | Plus simple, mais l'enseignant perd une information utile.                                                                                                                                              |

**À faire de votre côté**, en plus de [`docs/attentes-proprietaire.md`](../attentes-proprietaire.md) :

- relire le dossier, compléter et signer la lettre, l'envoyer au juriste avec les pièces jointes ou le lien partagé ;
- relire le kit du référent et compléter « Qui appeler » dans l'aide-mémoire ;
- relire la liste du jour J avec l'établissement ; compléter l'adresse du site sur la fiche élève ;
- quand le premier référent est trouvé : mener la séance de prise en main sur l'espace d'entraînement.

Le plus urgent reste : le juriste, la clé API et l'accord sur le coût, la relecture des deux skills, le premier référent.
