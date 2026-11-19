# Bilan du Jalon 10

**Date** : 2026-10-28 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; agents, messagerie et vidéo **simulés** (aucune clé API, aucun fournisseur branché) ; rien n'est déployé ni souscrit ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0065) : que le propriétaire invite les référents et crée les classes du pilote **depuis l'administration**, sans commande ni SQL. Ajouter aussi une première skill propre au projet : la protection des élèves mineurs.

| Étape du plan | État | Remarque |
|---|---|---|
| 1. Invitations de référents depuis l'administration | **Fait** | Code affiché une seule fois, empreinte seule en base ; liste sans codes ; annulation ; contrôles et audit en base (ADR 0066). |
| 2. Classes depuis l'administration | **Fait, en attente du juriste** | Deux codes affichés une seule fois. Nouveau code de classe, nouvelle invitation d'enseignant, annulation. Rappel de la question Q19 sur la page (ADR 0067). |
| 3. Skill « élèves mineurs » | **Fait, à valider par vous** | 7 règles pour le Professeur, l'Évaluateur, le Tuteur et le Support ; batterie commune MI (contact privé, secret). Aucun prompt modifié (ADR 0068). |
| 4. Passages réels des agents | **En attente** | Clé API, relecture de la skill, accord sur le coût (~119 USD). |
| 5. Démonstration et bilan | **Fait** | 7 captures ; ce document. |

**Le Jalon 10 sera clos** quand les passages réels auront atteint les seuils (étape 4).

## 2. Défauts trouvés en cours de route (tous corrigés)

- **Libellés des familles** (vu sur les captures) : sur la liste des invitations, une invitation de Mathématiques du Gabon s'affichait « Mathématiques (pays Z) ». Les libellés de tous les packs étaient mélangés par code de famille. Ils sont maintenant pris dans le pack du référentiel de l'invitation ; un test le vérifie.
- **Page des classes** : la validité du code était calculée avec l'heure du serveur pendant l'affichage, ce que React interdit. Elle est maintenant calculée par la base.
- **Test fragile** : `catalogue.spec.ts` allait sur le catalogue sans attendre la fin de l'inscription. Il l'attend maintenant.

## 3. Démonstration (captures sur téléphone, données et agents simulés)

Index et commande de régénération : [`docs/demo/jalon-10/README.md`](../demo/jalon-10/README.md).

| | Écran |
|---|---|
| 01 | [Administration : nouveaux liens](../demo/jalon-10/01-administration-liens.png) |
| 02 | [Invitation d'un référent](../demo/jalon-10/02-invitation-formulaire.png) |
| 03 | [Code affiché une seule fois](../demo/jalon-10/03-invitation-code-affiche-une-fois.png) |
| 04 | [Invitations, sans les codes](../demo/jalon-10/04-invitations-liste-sans-codes.png) |
| 05 | [Nouvelle classe](../demo/jalon-10/05-classe-formulaire.png) |
| 06 | [Deux codes affichés une seule fois](../demo/jalon-10/06-classe-deux-codes-affiches-une-fois.png) |
| 07 | [Liste des classes et actions](../demo/jalon-10/07-classes-liste-et-actions.png) |

## 4. Ce que vérifient les tests

| Série | Nombre | Commande |
|---|---|---|
| Tests unitaires (dont skill dans le prompt, batterie MI) | 248, tous passés | `pnpm test` |
| Base de données (dont U01 à U03 : invitations ; H01 à H03 : classes) | 121 scénarios, tous passés | `pnpm test:base` |
| Bout en bout sur téléphone simulé (dont invitations et classes depuis l'administration, avec audit d'accessibilité) | 97, tous passés | `pnpm test:e2e` |
| Agents, mécanique sans coût | MI conforme pour les quatre agents concernés. Non conformes connus de la simulation, inchangés : Professeur TC-02, TC-09, TC-10, PR-03, PR-06 ; Évaluateur EV-02 à EV-04, EF-01, EF-02 ; Coordinateur CM-02, CM-12, CM-16 | `pnpm test:agents [--agent …]` |

## 5. Coûts

| Poste | Estimation | Statut |
|---|---|---|
| Passages réels complets de toutes les batteries | ~119 USD (dont ~3,9 USD pour MI ; prompts allongés par la skill) | Non lancés : clé, relecture de la skill et accord attendus |
| Dépenses du jalon | 0 USD ; aucune dépendance ajoutée | — |

## 6. Décisions et actions attendues du propriétaire

Les attentes des bilans précédents restent ouvertes : juriste (dont Q19), clé API, référents, cadre du pilote, fournisseurs. S'y ajoutent :
1. **Relire la skill « élèves mineurs »** (`agents/_commun/skills/eleves-mineurs/SKILL.md`), puis la valider ou la corriger avant les passages réels.
2. **Inviter le premier référent** depuis `/administration` → « Inviter un référent » dès que votre choix est fait. Plus besoin de commande ni de SQL.
3. **Créer la classe pilote** depuis `/administration` → « Classes du pilote », seulement après l'avis du juriste (Q19).
