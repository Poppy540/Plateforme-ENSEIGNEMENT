# Bilan du Jalon 7

**Date** : 2026-10-22 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; agents, messagerie et vidéo **simulés** (aucune clé API, aucun fournisseur branché) ; rien n'est déployé ni souscrit ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0053) : renforcer ce que les élèves vivent vraiment, préparer le branchement des fournisseurs et ajouter une première matière littéraire, en attendant vos décisions.

| Étape du plan | État | Remarque |
|---|---|---|
| 1. Accessibilité et téléphones modestes | **Fait** | Audit automatique WCAG 2.0/2.1/2.2 A et AA de toutes les pages des 5 publics, thème sombre compris, sans aucune violation admise. Contrôles ajoutés : reflow à 320 px avec texte à 200 %, zones à toucher de 44 px, connexion au clavier. Corrections apportées (ADR 0054). |
| 2. Vidéo prête à brancher | **Fait, rien de souscrit** | Passerelle d'avatar générique et Cloudflare Stream, lecture HLS plafonnée en débit, MP4 de secours, tests de contrat sans réseau (ADR 0055). |
| 3. Journal sans donnée personnelle | **Fait** | Journal unique nettoyé, console du serveur nettoyée, erreurs de requête suivies, service de surveillance facultatif ; journaux réels relus : aucune donnée personnelle (ADR 0056). |
| 4. Français 3e | **Fait, provisoire** | 6 chapitres, 6 liens, valeurs des agents avec les garde-fous du Français (jamais rédiger à la place de l'élève, aucune citation inventée) (ADR 0057). |
| 5. Passages réels des agents | **En attente** | Clé API et accord sur le coût. |
| 6. Tests, démonstration, bilan | **Fait** | 6 captures ; ce document. |

**Le Jalon 7 sera clos** quand les passages réels des batteries auront atteint les seuils (étape 5).

## 2. Défauts trouvés en cours de route (tous corrigés)

- **Accessibilité** :
  - les tableaux défilants n'étaient pas atteignables au clavier ;
  - avec le texte agrandi, les cartes et les listes de chapitres débordaient de l'écran ;
  - le premier correctif coupait les mots trop tôt, et les captures l'ont montré ; il ne coupe plus que les mots plus larges que la ligne.
- **Journal** : l'empreinte d'erreur de Next.js était masquée à tort ; une page quittée avant la fin de son chargement était comptée comme erreur.
- **Tests fragiles** (sans effet sur la plateforme) : trois tests comptaient des données de toute la base (premier « Élève fictif », toutes les tentatives de quiz) ou utilisaient le Français comme exemple d'unité non configurée. Ils visent maintenant leurs propres données.

## 3. Démonstration (captures sur téléphone, données et agents simulés)

Index et commande de régénération : [`docs/demo/jalon-7/README.md`](../demo/jalon-7/README.md).

| | Écran |
|---|---|
| 01 | [Connexion au clavier, focus visible](../demo/jalon-7/01-connexion-au-clavier-focus-visible.png) |
| 02 | [Catalogue de 3e avec le Français](../demo/jalon-7/02-catalogue-3e-avec-le-francais.png) |
| 03 | [Français 3e : chapitres](../demo/jalon-7/03-francais-3e-chapitres.png) |
| 04 | [320 px et texte à 200 %](../demo/jalon-7/04-texte-agrandi-200-pourcent-320px.png) |
| 05 | [Thème sombre](../demo/jalon-7/05-espace-eleve-theme-sombre.png) |
| 06 | [Référent de Français](../demo/jalon-7/06-referent-francais-espace.png) |

## 4. Ce que vérifient les tests

| Série | Nombre | Commande |
|---|---|---|
| Tests unitaires (dont adaptateurs vidéo, journal, Français 3e) | 238 | `pnpm test` |
| Base de données | 111 scénarios | `pnpm test:base` |
| Bout en bout sur téléphone simulé (dont accessibilité, Français 3e) | 87 | `pnpm test:e2e` |
| Agents, mécanique sans coût | Inchangés depuis le Jalon 5 : conformes sauf les scénarios non conformes connus en simulation (Professeur TC-02, TC-09, TC-10, PR-03, PR-06 ; Évaluateur EV-02 à EV-04 ; Coordinateur CM-02, CM-12, CM-16) | `pnpm test:agents [--agent …]` |

## 5. Coûts

| Poste | Estimation | Statut |
|---|---|---|
| Passages réels complets de toutes les batteries | ~105,4 USD | Non lancés : clé et accord attendus |
| Vidéo réelle | Fournisseur d'avatar : son tarif par minute (à fixer) ; Stream : environ 0,005 USD par minute stockée et par mois, plus la diffusion ; arrêt au budget par vidéo (`BUDGET_VIDEO_USD`) | Rien de souscrit |
| Dépendance ajoutée | `@axe-core/playwright` 4.13.0, tests seulement, gratuite | Installée |

## 6. Décisions et actions attendues du propriétaire

Les attentes du bilan du Jalon 6 (§6) restent ouvertes : questionnaire, clé API, `SEL_OPPOSITION`, juriste, référents de Maths et de Sciences, fournisseurs et hébergement. S'y ajoutent :
1. **Référent de Français** et programmes IPN (œuvres et auteurs au programme).
2. **Fournisseur d'avatar** synthétique, et son tarif ; la passerelle à écrire suit le contrat du [dossier de production](../production/README.md) §3 bis.
3. **Service de surveillance** des erreurs, si vous en voulez un (facultatif).
4. Pendant le pilote, avec l'établissement : un **essai avec un lecteur d'écran** (TalkBack) sur un téléphone Android d'entrée de gamme.
