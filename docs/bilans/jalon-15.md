# Bilan du Jalon 15

**Date** : 2026-10-29 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; agents, messagerie et vidéo **simulés** (aucune clé API, aucun fournisseur branché) ; rien n'est déployé ni souscrit ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0087) : rassembler et clarifier. Il s'agissait de faire une page d'entrée unique pour le pilote et une liste unique de ce qui attend le propriétaire, et de rendre le rapport de fin lisible sur téléphone. **Aucune règle nouvelle** du pilote.

| Étape du plan                   | État           | Remarque                                                                                                                                                                                                                   |
| ------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Tableau de bord du pilote    | **Fait**       | Phase déduite des données (préparation, en cours, terminé, clôturé), décomptes, prochaine action avec son lien ; un encadré en tête de l'administration (ADR 0088).                                                        |
| 2. Ce qui vous attend           | **Fait**       | 22 points tirés des bilans 6 à 14. L'état est vérifié par la plateforme quand elle le voit, sinon « à confirmer ». Page, encadré et document `docs/attentes-proprietaire.md`, tenus en concordance par un test (ADR 0089). |
| 3. Rapport de fin sur téléphone | **Fait**       | Une carte par indicateur sur écran étroit ; le tableau reste sur grand écran et à l'impression (ADR 0090).                                                                                                                 |
| 4. Passages réels des agents    | **En attente** | Clé API, relecture des deux skills, accord sur le coût (~121 USD).                                                                                                                                                         |
| 5. Démonstration et bilan       | **Fait**       | 7 captures ; ce document.                                                                                                                                                                                                  |

**Le Jalon 15 sera clos** quand les passages réels auront atteint les seuils (étape 4, reprise des Jalons 11 à 14).

## 2. Défauts trouvés en cours de route (tous corrigés)

- **Liens en double** : l'encadré en tête de l'administration aurait créé un deuxième lien « Conditions du pilote ». Ce lien porte désormais le nom « Faire maintenant », suivi du nom de la page.
- **Tests** :
  - le test du rapport de fin vérifiait le tableau, désormais masqué sur téléphone. Il vérifie maintenant les cartes sur téléphone, et le tableau à l'impression et sur grand écran ;
  - un volet ouvert d'office se refermait au clic du test (déjà vu au Jalon 14).
- **Captures** : les deux encadrés du tableau de bord se touchaient ; un espace les sépare désormais.

## 3. Démonstration (captures sur téléphone, données fictives)

Index et commande de régénération : [`docs/demo/jalon-15/README.md`](../demo/jalon-15/README.md).

|     | Écran                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------- |
| 01  | [Encadré « Pilote » en tête de l'administration](../demo/jalon-15/01-administration-encadre-pilote.png) |
| 02  | [Tableau de bord : préparation](../demo/jalon-15/02-tableau-de-bord-preparation.png)                    |
| 03  | [Ce qui vous attend](../demo/jalon-15/03-ce-qui-vous-attend.png)                                        |
| 04  | [Tableau de bord : pilote en cours](../demo/jalon-15/04-tableau-de-bord-en-cours.png)                   |
| 05  | [Tableau de bord : pilote terminé](../demo/jalon-15/05-tableau-de-bord-termine.png)                     |
| 06  | [Rapport de fin en cartes sur téléphone](../demo/jalon-15/06-rapport-fin-cartes-telephone.png)          |
| 07  | [Tableau de bord : pilote clôturé](../demo/jalon-15/07-tableau-de-bord-cloture.png)                     |

## 4. Ce que vérifient les tests

| Série                                                                                                                                                      | Nombre                                       | Commande         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------- |
| Tests unitaires (dont phases et prochaine action, attentes et concordance avec le document)                                                                | 301, tous passés                             | `pnpm test`      |
| Base de données                                                                                                                                            | Tous passés (aucune migration dans ce jalon) | `pnpm test:base` |
| Bout en bout sur téléphone simulé (dont tableau de bord dans ses phases, attentes, rapport de fin en cartes et à l'impression, avec audit d'accessibilité) | 114, tous passés                             | `pnpm test:e2e`  |

L'intégration continue sur GitHub ne démarre toujours pas : aucune machine n'est attribuée (bilan du Jalon 12, §5).

## 5. Coûts

| Poste                                           | Estimation                        | Statut                                                    |
| ----------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| Passages réels complets de toutes les batteries | ~121 USD                          | Non lancés : clé, relecture des skills et accord attendus |
| Dépenses du jalon                               | 0 USD ; aucune dépendance ajoutée | —                                                         |

## 6. Décisions et actions attendues du propriétaire

**Désormais au même endroit** : [`docs/attentes-proprietaire.md`](../attentes-proprietaire.md), et la page « Ce qui vous attend » de l'administration. Aucun point nouveau dans ce jalon. Le plus urgent reste :

- trouver le juriste et lui transmettre le dossier ;
- la clé API et l'accord sur le coût ;
- la relecture des deux skills ;
- le premier référent.
