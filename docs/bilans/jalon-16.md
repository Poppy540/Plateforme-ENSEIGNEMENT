# Bilan du Jalon 16

**Date** : 2026-10-30 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; agents, messagerie et vidéo **simulés** (aucune clé API, aucun fournisseur branché) ; rien n'est déployé ni souscrit ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0091) : relire la sécurité et la confidentialité de tout ce que les Jalons 9 à 15 ont ajouté, **avant le premier déploiement** ; corriger ; ajouter des garde-fous automatiques pour que les migrations futures ne puissent pas oublier une règle.

| Étape du plan                | État           | Remarque                                                                                                                           |
| ---------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1. Revue                     | **Faite**      | [`docs/securite/revue-jalon-16.md`](../securite/revue-jalon-16.md) : **0 critique, 0 élevé**, 2 moyens, 5 faibles, 2 informations. |
| 2. Corrections et garde-fous | **Faite**      | S1, S4, S5, S6, S7 corrigés, chacun avec un test ; garde-fous GF01 à GF03 dans les tests de base (ADR 0092).                       |
| 3. Décisions du propriétaire | **Faite**      | D10 c, D11 a, D12 a appliquées (ADR 0093).                                                                                         |
| 4. Passages réels des agents | **En attente** | Clé API, relecture des deux skills, accord sur le coût (~121 USD).                                                                 |
| 5. Bilan                     | **Fait**       | 6 captures ; ce document ; dossier du juriste déjà mis à jour aux étapes 2 et 3 (T11, T12, §6).                                    |

**Le Jalon 16 sera clos** quand les passages réels auront atteint les seuils (étape 4, reprise des Jalons 11 à 15).

## 2. Ce qui a changé

**Corrections (ADR 0092)** :

- **S1 (moyen)** — saisie des codes (classe, invitation d'enseignant ou de référent) : 10 essais par compte et par jour, puis « Trop d'essais de code aujourd'hui ». Le code saisi n'est gardé nulle part.
- **S4** — le téléchargement du rapport de fin n'est noté comme geste de clôture que si la demande vient de la plateforme elle-même (même origine).
- **S5** — `pnpm verifier:site` contrôle aussi que les exports « Semaine du pilote » et « Fin du pilote » sont refusés sans session.
- **S6** — droit d'exécution retiré à `public` sur une fonction de déclencheur.
- **S7** — rappel dans le guide et nouveau thème T12 du dossier du juriste : pas de nom d'élève dans les textes libres de l'équipe.

**Garde-fous automatiques** (`76_tests_garde_fous.sql`), vérifiés en les faisant échouer exprès :

- GF01 : toute fonction `security definer` a un `search_path` fixé et n'est pas exécutable par `public` ;
- GF02 : seules 14 fonctions, listées et justifiées, sont accessibles sans connexion ;
- GF03 : règles d'accès sur toutes les tables ; sans connexion, seul le catalogue est lisible.

**Vos décisions (ADR 0093)** :

- **D10 c** (répond à S2) — chaque classe a une capacité (1 à 200), saisie à la création et modifiable. Classe pleine : le code est refusé à l'élève et une alerte arrive dans la file humaine, une seule tant qu'elle n'est pas traitée.
- **D11 a** (répond à S3) — les chiffres de l'enseignant restent à jour à chaque lecture ; un gel hebdomadaire sera fait si le juriste le demande (Q19).
- **D12 a** (répond à S9) — sauvegardes chiffrées avec `age` ; la clé privée reste hors du serveur ; une sauvegarde en clair est refusée en production. `pnpm verifier:production` et la condition 6 exigent la clé publique.

## 3. Défauts trouvés en cours de route (tous corrigés)

- **Régression du Jalon 15, trouvée par `pnpm repetition`** : la lecture des skills par un chemin calculé faisait embarquer tout le dépôt (tests de base compris) dans le paquet de déploiement, qui était donc refusé. Le chemin est désormais ancré dans `agents/`. La répétition générale a joué son rôle.
- **Contrainte de la table des limites** : les deux nouvelles natures d'essai étaient refusées (erreur serveur à l'activation) ; contrainte élargie (migration 0047).
- **Tests** : le test de la limite n'attendait pas chaque réponse du serveur ; les tests qui téléchargent le rapport de fin envoient désormais l'en-tête de même origine, et un test vérifie qu'une demande venue d'ailleurs n'est pas comptée.
- **Restauration chiffrée** : nettoyage du dossier temporaire et adresse de base mal construite dans le test de sauvegarde.

## 4. Démonstration (captures sur téléphone, données fictives)

Index et commande de régénération : [`docs/demo/jalon-16/README.md`](../demo/jalon-16/README.md).

|     | Écran                                                                                 |
| --- | ------------------------------------------------------------------------------------- |
| 01  | [Création d'une classe avec sa capacité](../demo/jalon-16/01-formulaire-capacite.png) |
| 02  | [Liste des classes : « 0 sur 1 (capacité) »](../demo/jalon-16/02-liste-capacite.png)  |
| 03  | [Élève : classe complète](../demo/jalon-16/03-eleve-classe-complete.png)              |
| 04  | [Alerte dans la file humaine](../demo/jalon-16/04-alerte-classe-complete.png)         |
| 05  | [Capacité relevée](../demo/jalon-16/05-capacite-relevee.png)                          |
| 06  | [Élève : trop d'essais de code](../demo/jalon-16/06-trop-d-essais.png)                |

## 5. Ce que vérifient les tests

| Série                                                                                                | Nombre                                   | Commande               |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------- |
| Tests unitaires                                                                                      | 305, tous passés                         | `pnpm test`            |
| Base de données (dont garde-fous GF01-GF03, capacité CC01-CC02 ; migrations 0047 et 0048)            | Tous passés                              | `pnpm test:base`       |
| Migrations suivies                                                                                   | Passés                                   | `pnpm test:migrations` |
| Sauvegarde et restauration (dont S05 chiffrée avec age, S06 clair refusé en production)              | S01 à S06 passés                         | `pnpm test:sauvegarde` |
| Bout en bout sur téléphone simulé (dont limite d'essais, classe pleine, téléchargement même origine) | 116, tous passés                         | `pnpm test:e2e`        |
| Répétition générale du déploiement                                                                   | 12 / 12, « RÉPÉTITION GÉNÉRALE RÉUSSIE » | `pnpm repetition`      |

L'intégration continue sur GitHub ne démarre toujours pas : aucune machine n'est attribuée (bilan du Jalon 12, §5). Elle installe désormais `age` avant le test de sauvegarde.

## 6. Coûts

| Poste                                           | Estimation                                               | Statut                                                    |
| ----------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| Passages réels complets de toutes les batteries | ~121 USD                                                 | Non lancés : clé, relecture des skills et accord attendus |
| Dépenses du jalon                               | 0 USD ; `age` est un outil libre et gratuit, hors paquet | —                                                         |

## 7. Décisions et actions attendues du propriétaire

**Toujours au même endroit** : [`docs/attentes-proprietaire.md`](../attentes-proprietaire.md), et la page « Ce qui vous attend » de l'administration. Ce jalon précise un point existant, l'hébergement :

- **générer la paire de clés `age` sur votre propre ordinateur** (`age-keygen -o cle-sauvegarde.txt`) ; seule la clé publique (`age1…`) va dans `SAUVEGARDE_DESTINATAIRE_AGE` sur le serveur ; la clé privée reste chez vous, avec une copie hors ligne (`docs/production/README.md`, §5) ;
- à la création de la vraie classe pilote, saisir l'effectif annoncé par l'établissement comme capacité.

Le plus urgent reste inchangé :

- trouver le juriste et lui transmettre le dossier (désormais avec T12) ;
- la clé API et l'accord sur le coût ;
- la relecture des deux skills ;
- le premier référent.

Hors de ce jalon : un audit externe (test d'intrusion) pourra être envisagé après le déploiement, avec votre accord sur le coût.
