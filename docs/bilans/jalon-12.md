# Bilan du Jalon 12

**Date** : 2026-10-28 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; agents, messagerie et vidéo **simulés** (aucune clé API, aucun fournisseur branché) ; rien n'est déployé ni souscrit ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0074) : que le premier déploiement soit une suite de gestes sûrs et déjà essayés, et que la décision de démarrer le pilote repose sur un tableau objectif.

| Étape du plan | État | Remarque |
|---|---|---|
| 1. Migrations suivies | **Fait** | `pnpm base:migrer [--simuler]` : migrations manquantes dans l'ordre, une transaction chacune, suivies en base avec leur empreinte ; fichier modifié refusé (ADR 0075). |
| 2. Paquet de déploiement | **Fait** | `pnpm paquet` : serveur autonome, prompts, skills, pack pilote, sans secret, test ni pack fictif ; exemples systemd et Caddy (ADR 0076). |
| 3. Répétition générale en local | **Fait** | `pnpm repetition` : 11 étapes, simulation coupée, configuration fictive tirée au hasard (ADR 0077). |
| 4. Tableau des 12 conditions | **Fait** | Page « Conditions du pilote » de l'administration : 2 conditions vérifiées seules, 6 vérifiées et cochées, 4 cochées avec preuve ; décompte N / 12 (ADR 0078). |
| 5. Passages réels des agents | **En attente** | Clé API, relecture des deux skills, accord sur le coût (~121 USD). |
| 6. Démonstration et bilan | **Fait** | 5 captures ; ce document. |

**Le Jalon 12 sera clos** quand les passages réels auront atteint les seuils (étape 5).

## 2. Résultat de la répétition générale (dernier passage, 2026-10-28)

```
✓ Migrations simulées (aucune écriture)
✓ Migrations appliquées
✓ Second passage : base à jour
✓ Import du pack pilote
✓ Configuration de production complète (hors API Supabase, injoignable en local)
✓ Paquet de déploiement
✓ Serveur du paquet : santé
✓ Vérification du site (simulation fermée, accès refusés)
✓ Journal du serveur sans erreur ni donnée sensible
✓ Sauvegarde
✓ Restauration vérifiée
RÉPÉTITION GÉNÉRALE RÉUSSIE
```

Reste à essayer sur le vrai site (guide de mise en route, E3) : https et HSTS, authentification Supabase et fermeture de son API de données, SMS et emails réels, Claude et la vidéo, sauvegardes de l'hébergeur.

## 3. Défauts trouvés en cours de route (tous corrigés)

- **Test de base** : il supposait un seul référent de Mathématiques, alors que d'autres tests en ajoutent. Le cas « matière sans référent » retire maintenant le rôle à tous ses référents, le temps d'une transaction annulée.
- **Captures** :
  - grands blancs entre les lignes d'une condition : les marges des paragraphes sont retirées dans les cartes ;
  - « 1 classe créée(s) » : remplacé par « 1 classe du pilote, dont 0 avec un enseignant activé ».

## 4. Démonstration (captures sur téléphone, données fictives)

Index et commande de régénération : [`docs/demo/jalon-12/README.md`](../demo/jalon-12/README.md).

| | Écran |
|---|---|
| 01 | [Au départ : 0 / 12](../demo/jalon-12/01-conditions-au-depart.png) |
| 02 | [Conditions 3 et 4 vérifiées par la plateforme](../demo/jalon-12/02-conditions-3-et-4-verifiees-par-la-plateforme.png) |
| 03 | [Cocher avec une preuve datée](../demo/jalon-12/03-cocher-avec-une-preuve.png) |
| 04 | [Condition mixte « À revoir »](../demo/jalon-12/04-condition-mixte-a-revoir.png) |
| 05 | [Tableau complet : 5 / 12](../demo/jalon-12/05-tableau-des-conditions.png) |

## 5. Ce que vérifient les tests

| Série | Nombre | Commande |
|---|---|---|
| Tests unitaires (dont migrations, vérification de site, conditions du pilote, masquage des coordonnées) | 266, tous passés | `pnpm test` |
| Base de données (dont CO01 et CO02) | 127 scénarios, tous passés | `pnpm test:base` |
| Migrations suivies (M01 à M06) | Réussi | `pnpm test:migrations` |
| Sauvegarde et restauration | Réussi | `pnpm test:sauvegarde` |
| Répétition générale | 11 étapes réussies | `pnpm repetition` |
| Bout en bout sur téléphone simulé (dont conditions du pilote, avec audit d'accessibilité) | 101, tous passés | `pnpm test:e2e` |
| Agents, mécanique sans coût | Non conformes connus de la simulation, inchangés : Professeur TC-02, TC-09, TC-10, PR-03, PR-06 ; Évaluateur EV-02 à EV-04, EF-01, EF-02 ; Coordinateur CM-02, CM-12, CM-16 | `pnpm test:agents [--agent …]` |

**Intégration continue sur GitHub : elle ne tourne pas.** Les passages des workflows « Application » et « Tests des agents » finissent tous en échec en 4 secondes, sans qu'aucune machine ne leur soit attribuée (`runner_id` vide). C'est le cas depuis au moins le 19 octobre. Aucune étape n'est exécutée, donc ce n'est pas le code : c'est le compte GitHub. Causes habituelles : quota de minutes des Actions épuisé, plafond de dépense à 0, moyen de paiement à jour exigé, ou Actions désactivées pour le dépôt. Les résultats ci-dessus viennent des passages faits ici, en local.

## 6. Coûts

| Poste | Estimation | Statut |
|---|---|---|
| Passages réels complets de toutes les batteries | ~121 USD | Non lancés : clé, relecture des skills et accord attendus |
| Dépenses du jalon | 0 USD ; aucune dépendance ajoutée | — |

## 7. Décisions et actions attendues du propriétaire

Les attentes des bilans précédents restent ouvertes : juriste (dont Q19), clé API, relecture des skills « élèves mineurs » et « files d'approbation », référents, chapitres du pilote, fournisseurs et hébergement. S'y ajoutent :
1. **GitHub Actions** : dans les réglages du compte ou du dépôt (Settings → Actions, et Billing), vérifier pourquoi les tâches ne démarrent pas. Rien n'est à acheter sans votre décision : sur un dépôt privé, un quota gratuit de minutes existe chaque mois.
2. **Avant le déploiement** : lancer `pnpm repetition`, qui doit finir par « RÉPÉTITION GÉNÉRALE RÉUSSIE ».
3. **Au fil de l'eau** : cocher les conditions du pilote dans l'administration, page « Conditions du pilote », avec une preuve courte et sa date. La décision de démarrer (G2) se prend à 12 / 12.
