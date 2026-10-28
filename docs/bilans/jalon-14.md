# Bilan du Jalon 14

**Date** : 2026-10-28 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; agents, messagerie et vidéo **simulés** (aucune clé API, aucun fournisseur branché) ; rien n'est déployé ni souscrit ; **aucun élève réel** ; **aucune donnée effacée**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0083) : boucler le cycle du pilote. Le Jalon 12 outillait la décision de démarrer et le Jalon 13 le suivi de chaque semaine. Ce jalon outille la fin : rapport, clôture et sort des données, sans rien effacer.

| Étape du plan                | État           | Remarque                                                                                                                                                                                 |
| ---------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Période et rapport de fin | **Fait**       | Dates du pilote ; les 5 questions sur toute la période et semaine par semaine ; questionnaire ; critères et décisions. Version équipe ou établissement ; impression et texte (ADR 0084). |
| 2. Clôture du pilote         | **Fait**       | 8 gestes, dont 4 vérifiés par la plateforme et 4 cochés avec preuve. Décision finale (arrêter, prolonger, élargir) au journal (ADR 0085).                                                |
| 3. Sort des données          | **Fait**       | Simulation seulement, par pays du pilote, 7 catégories ; rappel de l'avis du juriste. La fiche d'information gagne « Après l'essai » (ADR 0086).                                         |
| 4. Passages réels des agents | **En attente** | Clé API, relecture des deux skills, accord sur le coût (~121 USD).                                                                                                                       |
| 5. Démonstration et bilan    | **Fait**       | Un pilote fictif de 4 semaines, du début à la clôture ; 6 captures ; ce document.                                                                                                        |

**Le Jalon 14 sera clos** quand les passages réels auront atteint les seuils (étape 4, reprise des Jalons 11 à 13).

## 2. Défauts trouvés en cours de route (tous corrigés)

- **Calcul en double** : les chiffres d'une période étaient écrits dans le rapport de la semaine. Ils sont maintenant calculés par une seule fonction, et le rapport de la semaine l'appelle. Un test vérifie que les deux donnent les mêmes chiffres.
- **Réservoir de connexions** : le rapport de fin calculait les semaines (jusqu'à 53) en parallèle. Elles sont maintenant calculées l'une après l'autre, dans une seule transaction.
- **Tests** :
  - un volet ouvert d'office se refermait au clic du test ;
  - un élève ne peut passer deux fois le même quiz, ce que la démonstration ignorait ;
  - les versions de quiz sont numérotées par la base, ce que la démonstration ignorait aussi.
- **Captures** : le tableau du sort des données était coupé sur téléphone. Il est remplacé par des cartes, comme la vue de l'enseignant.

## 3. Démonstration (captures sur téléphone, pilote fictif)

Index et commande de régénération : [`docs/demo/jalon-14/README.md`](../demo/jalon-14/README.md).

|     | Écran                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------- |
| 01  | [Période du pilote](../demo/jalon-14/01-periode-du-pilote.png)                                                    |
| 02  | [Rapport de fin, version équipe](../demo/jalon-14/02-rapport-fin-version-equipe.png)                              |
| 03  | [Rapport de fin, version établissement](../demo/jalon-14/03-rapport-fin-version-etablissement.png)                |
| 04  | [Décision d'arrêt, mise en veille à faire](../demo/jalon-14/04-cloture-decision-arret-mise-en-veille-a-faire.png) |
| 05  | [Clôture complète](../demo/jalon-14/05-cloture-complete.png)                                                      |
| 06  | [Sort des données, simulation](../demo/jalon-14/06-sort-des-donnees-simulation.png)                               |

Limite connue : sur téléphone, les tableaux du rapport de fin (total et une colonne par semaine) défilent horizontalement. Ils sont lisibles en entier à l'impression et dans le fichier texte.

## 4. Ce que vérifient les tests

| Série                                                                                                          | Nombre           | Commande               |
| -------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------- |
| Tests unitaires (dont semaines, rapport de fin, clôture, sort des données)                                     | 292, tous passés | `pnpm test`            |
| Base de données (dont FP01 à FP03, CL01 à CL03, SD01 à SD03)                                                   | Tous passés      | `pnpm test:base`       |
| Migrations suivies                                                                                             | Réussi           | `pnpm test:migrations` |
| Bout en bout sur téléphone simulé (dont rapport de fin, clôture, sort des données, avec audit d'accessibilité) | 111, tous passés | `pnpm test:e2e`        |

L'intégration continue sur GitHub ne démarre toujours pas : aucune machine n'est attribuée (bilan du Jalon 12, §5).

## 5. Coûts

| Poste                                           | Estimation                        | Statut                                                    |
| ----------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| Passages réels complets de toutes les batteries | ~121 USD                          | Non lancés : clé, relecture des skills et accord attendus |
| Dépenses du jalon                               | 0 USD ; aucune dépendance ajoutée | —                                                         |

## 6. Décisions et actions attendues du propriétaire

Les attentes des bilans précédents restent ouvertes :

- juriste (dont Q19 et les durées de conservation) ;
- clé API ;
- relecture des skills « élèves mineurs » et « files d'approbation » ;
- référents ;
- chapitres du pilote ;
- fournisseurs et hébergement ;
- seuils du suivi et budget de la semaine ;
- GitHub Actions.

S'y ajoutent :

1. **Faire relire par le juriste** la nouvelle section « Après l'essai » de la fiche d'information (`docs/pilote/fiche-information.md`) et la version établissement du rapport de fin.
2. **Avant le pilote**, fixer avec l'établissement :
   - les dates (elles serviront au rapport de fin) ;
   - le format attendu du rapport de pilote.
3. **À la fin du pilote** : suivre la page « Clôture du pilote » jusqu'à « 8 / 8 », puis consulter « Sort des données » avec le juriste.
