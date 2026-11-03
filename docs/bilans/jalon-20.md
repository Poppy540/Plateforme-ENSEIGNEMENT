# Bilan du Jalon 20

**Dates** : 2026-11-02 au 2026-11-03 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; rien n'est déployé ni souscrit ; seuls des outils gratuits pour un dépôt public sont utilisés.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0104) : le dépôt est public depuis le Jalon 18. Trois risques restaient :

- des dépendances avec des failles connues ;
- un code que rien n'analysait ;
- aucun moyen de signaler une faille.

Les réglages de GitHub restaient aussi à faire.

| Étape du plan                | État                  | Remarque                                                                                                                              |
| ---------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Audit des dépendances     | **Faite**             | 12 failles, dont **2 critiques et 1 élevée dans Next.js**, corrigées ; audit dans `pnpm controler` ; une exception écrite (ADR 0105). |
| 2. Outils de GitHub          | **Faite**             | Actions épinglées par empreinte, CodeQL, Dependabot, `SECURITY.md` (ADR 0106).                                                        |
| 3. Réglages GitHub           | **Faite de mon côté** | Guide en 5 étapes et `pnpm verifier:depot` en lecture seule (ADR 0107). Les réglages eux-mêmes sont à faire par vous.                 |
| 4. Passages réels des agents | **En attente**        | Clé API, relecture des deux skills, accord sur le coût (~121 USD).                                                                    |
| 5. Bilan                     | **Fait**              | Ce document. Pas de captures : aucun écran ne change.                                                                                 |

## 2. Ce qui a changé

- **Next.js 16.4.3** remplace la version 16.3.8, touchée par deux failles critiques (exécution de code à distance) et une élevée (déni de service par les actions serveur, que la plateforme utilise). Corrigés aussi, côté outils de développement : Vitest, Vite et zod. Chaque fois, la dernière version publiée depuis au moins une semaine ; aucune version majeure ne change.
- **L'audit fait partie du contrôle**, dès le niveau rapide. Il échoue sur une faille élevée ou critique sans exception écrite, et sur une exception expirée. Une seule exception aujourd'hui : minimatch, outil de développement, jusqu'au 31 janvier 2027.
- **Actions GitHub épinglées** : chaque action est fixée à une empreinte de commit, plus à une étiquette qui pourrait être déplacée. Un test le vérifie.
- **CodeQL** analyse le code à chaque envoi et chaque semaine. Premières analyses : réussies.
- **Dependabot** proposera chaque lundi les mises à jour, regroupées. Rien n'est fusionné sans contrôle vert et sans décision humaine.
- **`SECURITY.md`** explique comment signaler une faille en privé.
- **`pnpm verifier:depot`** relève, sans droits ni jeton, l'état des réglages de sécurité du dépôt.

## 3. Constats

- **Vous aviez déjà activé** l'analyse des secrets et la protection à l'envoi.
- **Restent à faire** (guide, étapes 1 à 4) : le signalement privé des failles, les mises à jour de sécurité Dependabot, la protection de `main`, l'adresse email privée (4 commits récents sur 8 de `main` portent une adresse publique).
- **`SECURITY.md`, Dependabot et CodeQL ne s'appliquent qu'une fois sur `main`** : la branche de travail doit y être fusionnée, par une demande de fusion que je prépare si vous le demandez (guide, étape 5).
- **Vite était une dépendance « pair »** de Vitest, que les règles de forçage de pnpm ne touchent pas : il a fallu le déclarer explicitement pour obtenir la version corrigée.
- **Depuis cet environnement**, l'API publique de GitHub limitait l'adresse de sortie directe ; la vérification passe par le proxy quand il existe, et explique une limite atteinte.

## 4. Ce que vérifient les tests

| Série                                                                  | Nombre                                                                                              | Commande         |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------- |
| Tests unitaires (dont audit, actions épinglées, vérification du dépôt) | 342, tous passés                                                                                    | `pnpm test`      |
| Contrôle complet après la mise à jour de Next.js                       | 9 / 9 réussis, budgets de poids compris                                                             | `pnpm controler` |
| GitHub Actions                                                         | Contrôle complet vert (passage n° 107, étape 2) ; CodeQL vert (2 analyses) ; tests des agents verts | —                |

## 5. Coûts

| Poste                                           | Estimation                                                                         | Statut                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Passages réels complets de toutes les batteries | ~121 USD                                                                           | Non lancés : clé, relecture des skills et accord attendus |
| Dépenses du jalon                               | 0 USD ; aucun service payant ; une seule dépendance déclarée (Vite, déjà installé) | —                                                         |

## 6. Décisions et actions attendues du propriétaire

**Nouveau, environ 15 minutes** : suivre [`docs/securite/reglages-github.md`](../securite/reglages-github.md), puis lancer `pnpm verifier:depot` jusqu'à « Dépôt conforme ». Pour l'étape 5 du guide (fusion dans `main`), me demander la demande de fusion.

Toujours au même endroit : [`docs/attentes-proprietaire.md`](../attentes-proprietaire.md). Le plus urgent reste :

- le juriste ;
- la clé API et l'accord sur le coût ;
- la relecture des deux skills ;
- le premier référent.
