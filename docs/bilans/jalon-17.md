# Bilan du Jalon 17

**Date** : 2026-10-30 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; agents, messagerie et vidéo **simulés** (aucune clé API, aucun fournisseur branché) ; rien n'est déployé ni souscrit ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0094) : GitHub Actions ne démarre plus depuis le 19 octobre ; plus rien ne vérifiait automatiquement chaque envoi. Les neuf contrôles du projet sont désormais réunis en **une seule commande**, utilisable avant chaque envoi et avant chaque déploiement, et la même commande servira à GitHub le jour où il sera débloqué.

| Étape du plan                | État           | Remarque                                                                                                                                                           |
| ---------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. La commande               | **Faite**      | `pnpm controler` : outils vérifiés d'abord, niveaux rapide et complet, continue après un échec, résumé (ADR 0095).                                                 |
| 2. Rapport daté              | **Fait**       | Un rapport par passage, valeurs sensibles masquées ; le paquet de déploiement note le dernier contrôle complet réussi de son commit dans `CONTROLE.md` (ADR 0096). |
| 3. Branchements              | **Faits**      | Intégration continue sur la même commande, crochet avant envoi facultatif, documentation ; **D13 a** : preuve de la condition 6 (ADR 0097).                        |
| 4. Passages réels des agents | **En attente** | Clé API, relecture des deux skills, accord sur le coût (~121 USD).                                                                                                 |
| 5. Bilan                     | **Fait**       | Ce document ; un [rapport de contrôle complet en exemple](../demo/jalon-17/README.md). Pas de captures : aucun écran ne change.                                    |

**Le Jalon 17 sera clos** quand les passages réels auront atteint les seuils (étape 4, reprise des Jalons 11 à 16).

## 2. Comment s'en servir

| Quand                       | Commande (depuis `application/`)        | Durée sur la machine de développement |
| --------------------------- | --------------------------------------- | ------------------------------------- |
| Avant chaque envoi          | `pnpm controler --rapide`               | environ 25 s                          |
| Avant chaque déploiement    | `pnpm controler`, sur une copie propre  | environ 4 à 5 min                     |
| Voir ce qui est prêt        | `pnpm controler --liste`                | immédiat                              |
| Contrôle rapide automatique | `pnpm controler:installer` (facultatif) | à chaque `git push`                   |

Puis `pnpm paquet` : `CONTROLE.md` doit dire « contrôle complet réussi » pour cocher la condition 6 (décision D13).

## 3. Défauts trouvés en cours de route (tous corrigés)

- **La commande s'est contrôlée elle-même** : son premier passage complet a trouvé une erreur de types dans son propre code, qui faisait aussi échouer la répétition générale et les tests de bout en bout. Elle a joué son rôle dès le premier jour.
- **Erreur introuvable** : l'erreur de types était au milieu d'une longue sortie et n'apparaissait pas dans les dernières lignes. Les lignes d'erreur s'affichent désormais en premier.
- **Affichage dans un fichier** : la ligne « en cours » se mélangeait au résultat hors d'un terminal ; elle n'est plus écrite qu'à l'écran.
- **Artefact GitHub** : le dossier des rapports commence par un point, et GitHub l'aurait ignoré sans l'option `include-hidden-files`, ajoutée.
- **Format de `CLAUDE.md`** : Prettier avait reformaté les règles recopiées de vos instructions ; texte remis tel quel.

## 4. Ce que vérifient les tests

Dernier contrôle complet, sur le commit final de l'étape 3, copie propre : **9 / 9 réussis en 4 min 17 s**.

| Série                                                                                                                    | Nombre                                                                                                | Commande              |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------- |
| Tests unitaires (dont 13 du contrôle : niveaux, outils, rapport, masquage, choix du paquet, crochet, flux d'intégration) | 317, tous passés                                                                                      | `pnpm test`           |
| Base de données                                                                                                          | Tous passés (aucune migration)                                                                        | `pnpm test:base`      |
| Migrations suivies, sauvegarde S01 à S06                                                                                 | Passés                                                                                                | dans `pnpm controler` |
| Bout en bout sur téléphone simulé                                                                                        | 116, tous passés                                                                                      | `pnpm test:e2e`       |
| Répétition générale du déploiement                                                                                       | 12 / 12                                                                                               | `pnpm repetition`     |
| Essais à la main                                                                                                         | outil manquant, paquet avec et sans contrôle, crochet posé, refusé devant un crochet étranger, retiré | —                     |

L'intégration continue sur GitHub ne démarre toujours pas : le nouveau flux n'a donc pas encore tourné là-bas.

## 5. Coûts

| Poste                                           | Estimation                        | Statut                                                    |
| ----------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| Passages réels complets de toutes les batteries | ~121 USD                          | Non lancés : clé, relecture des skills et accord attendus |
| Dépenses du jalon                               | 0 USD ; aucune dépendance ajoutée | —                                                         |

## 6. Décisions et actions attendues du propriétaire

**Toujours au même endroit** : [`docs/attentes-proprietaire.md`](../attentes-proprietaire.md), et la page « Ce qui vous attend » de l'administration. Ce jalon précise un point existant, l'hébergement : avant de déployer, `pnpm controler` sur une copie propre, puis `pnpm paquet`, dont `CONTROLE.md` sert de preuve à la condition 6.

Facultatif : poser le crochet avant envoi sur votre poste (`pnpm controler:installer`).

Le plus urgent reste inchangé :

- trouver le juriste et lui transmettre le dossier ;
- la clé API et l'accord sur le coût ;
- la relecture des deux skills ;
- le premier référent ;
- débloquer GitHub Actions (réglages du dépôt et facturation), pour que le contrôle tourne aussi à chaque envoi.
