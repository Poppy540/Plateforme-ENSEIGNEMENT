# Bilan du Jalon 23

**Dates** : 2026-11-11 au 2026-11-12 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; rien n'est déployé ni souscrit.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0115) : rien de technique ne bloque plus le pilote. Il fallait que les documents disent juste, sans doublon, pour que vous sachiez en une page quoi faire, dans quel ordre et avec qui. Aucune fonction nouvelle.

| Étape du plan                 | État           | Remarque                                                                                                                       |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1. Une seule liste d'attentes | **Faite**      | Par urgence, avec qui agit et le temps indicatif ; même liste et même ordre dans la plateforme et le document (ADR 0116).      |
| 2. `memory.md` court          | **Faite**      | 304 → 98 lignes, avec les cinq rubriques de votre prompt ; le détail daté dans `docs/historique.md`, rien de perdu (ADR 0117). |
| 3. Documents et liens         | **Faite**      | README en porte d'entrée, documents corrigés, deux archives datées, contrôle des liens internes (ADR 0118).                    |
| 4. Passages réels des agents  | **En attente** | Clé API, relecture des deux skills, accord sur le coût (~121 USD).                                                             |
| 5. Bilan                      | **Fait**       | Ce document et une capture ([`docs/demo/jalon-23/`](../demo/jalon-23/README.md)).                                              |

## 2. Ce qui a changé

- **[Ce qui vous attend](../attentes-proprietaire.md)**, à jour au Jalon 22, est rangé en cinq groupes :
  1. maintenant : ce qui prend le plus de temps ;
  2. avant de déployer le site ;
  3. avant de démarrer le pilote ;
  4. pendant et après le pilote ;
  5. facultatif.

  Chaque point dit qui agit, le temps indicatif, ce qu'il débloque et où agir. La page de l'administration montre la même liste, dans le même ordre (un test le vérifie).

- **`memory.md`** tient en une page. Il garde ses cinq rubriques : décisions validées avec date (vos décisions D1 à D16 et les principes), hypothèses, questions ouvertes, état d'avancement, prochaine étape. S'y ajoutent la méthode de travail, les règles fixes et les pièges connus, regroupés. Le journal complet des 23 jalons est dans [`docs/historique.md`](../historique.md).
- **Le [README du dépôt](../../README.md)** dit maintenant où en est le projet et quoi lire selon qui l'on est. Quatre documents faux ont été corrigés ; deux documents datés sont marqués « Archive datée ».
- **`pnpm verifier:liens`**, dans le contrôle rapide : un lien cassé entre documents fait échouer le contrôle.

## 3. Constats

- **Aucun lien n'était cassé** : 370 liens dans 306 documents. Les documents faux l'étaient par leur contenu (état du projet, skills, chemin du navigateur, sommaire incomplet), pas par leurs liens.
- **Deux erreurs de ma part, rattrapées avant l'envoi** :
  - ma première version de `memory.md` supprimait les rubriques que votre prompt demande (décisions datées, hypothèses, questions) : elles sont rétablies, en version courte ;
  - l'outil de mise en forme avait réaligné des tableaux entiers dans trois documents que je ne corrigeais que d'une ligne : modifications refaites à la main. Les deux pièges sont notés dans `memory.md`.
- **Les temps indicatifs** de la liste sont mes estimations : corrigez-les à l'usage.
- **Sur GitHub**, un envoi qui ne touche que des documents ne relance pas le contrôle complet : les liens ne sont alors contrôlés que localement. C'est voulu (ADR 0118).

## 4. Ce que vérifient les tests

| Série            | Nombre                                                                          | Commande                  |
| ---------------- | ------------------------------------------------------------------------------- | ------------------------- |
| Tests unitaires  | 358, tous passés (dont l'ordre de la liste d'attentes et le contrôle des liens) | `pnpm test`               |
| Contrôle rapide  | 6 / 6 réussis (liens compris)                                                   | `pnpm controler --rapide` |
| Contrôle complet | 10 / 10 réussis après l'étape 1 (seul écran modifié)                            | `pnpm controler`          |
| GitHub Actions   | Vert sur les étapes 1 et 3 (`17e2f4d`, `6118a8e`)                               | —                         |

## 5. Coûts

| Poste                                           | Estimation                        | Statut                                                    |
| ----------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| Passages réels complets de toutes les batteries | ~121 USD                          | Non lancés : clé, relecture des skills et accord attendus |
| Dépenses du jalon                               | 0 USD ; aucune dépendance ajoutée | —                                                         |

## 6. Décisions et actions attendues du propriétaire

**Tout est dans [Ce qui vous attend](../attentes-proprietaire.md), par urgence.** Le premier groupe, « Maintenant » :

- trouver le juriste et lui envoyer le dossier ;
- envoyer la lettre de demande du curriculum ;
- trouver le premier référent ;
- relire les deux skills ;
- fournir la clé API et donner l'accord sur le coût ;
- faire les réglages GitHub (15 minutes).

Question facultative toujours ouverte : les heures du journal de l'administration à l'heure du pays ?
