# Bilan du Jalon 13

**Date** : 2026-10-28 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; agents, messagerie et vidéo **simulés** (aucune clé API, aucun fournisseur branché) ; rien n'est déployé ni souscrit ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0079) : une fois le pilote lancé, voir chaque semaine, sans rien calculer à la main, si un critère de suspension est atteint ; tracer chaque décision ; disposer d'un rapport agrégé pour le point hebdomadaire et pour l'établissement. Principe : **la plateforme signale, le propriétaire décide**.

| Étape du plan                        | État           | Remarque                                                                                                                                                                                      |
| ------------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Critères de suspension surveillés | **Fait**       | Page « Critères de suspension ». 4 critères sont calculés et 8 déclarés ; les seuils sont dans le pack (à valider) ; une alerte par épisode arrive dans la file humaine (ADR 0080).           |
| 2. Journal du pilote et reprise      | **Fait**       | L'administration peut suspendre un agent (ce bouton manquait). Une reprise exige 4 points, contrôlés par la base. Le critère « deux suspensions pour une même cause » est calculé (ADR 0081). |
| 3. Rapport hebdomadaire agrégé       | **Fait**       | Page « Semaine du pilote », en version équipe ou établissement. Elle s'imprime et se télécharge en texte (ADR 0082).                                                                          |
| 4. Passages réels des agents         | **En attente** | Clé API, relecture des deux skills, accord sur le coût (~121 USD).                                                                                                                            |
| 5. Démonstration et bilan            | **Fait**       | Une semaine fictive jouée de bout en bout ; 6 captures ; ce document.                                                                                                                         |

**Le Jalon 13 sera clos** quand les passages réels auront atteint les seuils (étape 4, reprise des Jalons 11 et 12).

## 2. Défauts trouvés en cours de route (tous corrigés)

- **Bouton manquant** : `criteres-arret.md` disait qu'on pouvait « Suspendre un agent » depuis l'administration. Seul l'Orchestrateur pouvait le faire, sur un coût anormal. Un volet « Suspendre … » a été ajouté.
- **Reprise trop facile** : « Réactiver » et « Rouvrir l'accès » agissaient en un clic, sans les 4 points exigés par le document. La base les exige désormais.
- **Tests** :
  - le test « matière sans référent » supposait un seul référent de Mathématiques ;
  - le nettoyage d'un test de bout en bout envoyait plusieurs commandes SQL en une seule requête préparée ;
  - deux zones de la page de la semaine portaient le même nom pour les lecteurs d'écran.
- **Captures** :
  - les champs de la reprise coupaient le texte sur téléphone : ce sont maintenant des zones de texte ;
  - les intitulés des tableaux de la semaine étaient centrés : ils sont alignés à gauche, les chiffres à droite ;
  - une reprise répétait son titre dans le journal : elle est maintenant décrite par sa cause et sa correction.

## 3. Démonstration (captures sur téléphone, semaine fictive)

Index et commande de régénération : [`docs/demo/jalon-13/README.md`](../demo/jalon-13/README.md).

|     | Écran                                                                                               |
| --- | --------------------------------------------------------------------------------------------------- |
| 01  | [Critère atteint : détresse sans prise en charge](../demo/jalon-13/01-critere-atteint-detresse.png) |
| 02  | [Accès des élèves fermé, décision notée](../demo/jalon-13/02-acces-ferme-decision-notee.png)        |
| 03  | [Reprise avec les 4 points](../demo/jalon-13/03-reprise-quatre-points.png)                          |
| 04  | [Journal du pilote](../demo/jalon-13/04-journal-du-pilote.png)                                      |
| 05  | [Semaine du pilote, version équipe](../demo/jalon-13/05-semaine-version-equipe.png)                 |
| 06  | [Semaine du pilote, version établissement](../demo/jalon-13/06-semaine-version-etablissement.png)   |

## 4. Ce que vérifient les tests

| Série                                                                                           | Nombre                                           | Commande                       |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------ |
| Tests unitaires (dont critères, seuils du pack, rapport de la semaine)                          | 279, tous passés                                 | `pnpm test`                    |
| Base de données (dont CR01 à CR03, JP01 à JP04, SP01 et SP02)                                   | Tous passés                                      | `pnpm test:base`               |
| Migrations suivies                                                                              | Réussi                                           | `pnpm test:migrations`         |
| Bout en bout sur téléphone simulé (dont critères, journal, semaine, avec audit d'accessibilité) | 107, tous passés                                 | `pnpm test:e2e`                |
| Agents, mécanique sans coût                                                                     | Non conformes connus de la simulation, inchangés | `pnpm test:agents [--agent …]` |

L'intégration continue sur GitHub ne démarre toujours pas : aucune machine n'est attribuée aux tâches (bilan du Jalon 12, §5). Les résultats ci-dessus viennent des passages faits ici.

## 5. Coûts

| Poste                                           | Estimation                        | Statut                                                    |
| ----------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| Passages réels complets de toutes les batteries | ~121 USD                          | Non lancés : clé, relecture des skills et accord attendus |
| Dépenses du jalon                               | 0 USD ; aucune dépendance ajoutée | —                                                         |

## 6. Décisions et actions attendues du propriétaire

Les attentes des bilans précédents restent ouvertes : juriste (dont Q19), clé API, relecture des skills « élèves mineurs » et « files d'approbation », référents, chapitres du pilote, fournisseurs et hébergement, GitHub Actions. S'y ajoutent :

1. **Valider les seuils du suivi** dans `referentiels/gabon/pays.yaml`, section `pilote`. Les valeurs proposées : 2 h et 12 h pour une détresse, 7 jours pour une erreur de contenu, 2 contestations, budget plus 50 %. Puis passer leur statut à « validé » dans `SOURCES.md`.
2. **Fixer le budget hebdomadaire des agents** (`budget_hebdomadaire_usd`). Sans lui, le critère de coût reste « non surveillé ».
3. **Valider le contenu de la version établissement** du rapport de la semaine avant de la transmettre : usage, aide, signalements reçus et traités. Le juriste peut être consulté.
4. **Pendant le pilote** :
   - passer chaque semaine sur « Critères de suspension », puis « Semaine du pilote » ;
   - noter le point hebdomadaire au journal.
