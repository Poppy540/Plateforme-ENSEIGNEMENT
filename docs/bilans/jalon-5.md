# Bilan du Jalon 5

**Date** : 2026-10-20 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; modèles et messagerie **simulés** (aucune clé API, aucun fournisseur SMS ou email branché) ; rien n'est déployé ni souscrit ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0042) : préparer la plateforme au réel sans rien déployer, puis étendre la famille Mathématiques au lycée.

| Étape du plan | État | Remarque |
|---|---|---|
| 0. Revue de sécurité et de confidentialité | **Fait** | Aucun constat critique ; 3 élevés corrigés (accord parental contournable, jetons du parent visibles par l'élève, modèle de configuration en mode développement), 11 autres corrigés ; 9 points à votre décision (ADR 0043, `docs/securite/revue-jalon-5.md`). |
| 1. Connexions lentes et hors ligne | **Fait** | Chapitres ouverts lisibles hors ligne, cloisonnés par personne et effacés à la déconnexion ; questions gardées puis envoyées ; budget de 200 Ko par page (mesuré : 145 à 150 Ko) (ADR 0044). |
| 2. Fournisseurs prêts à brancher | **Fait, aucun envoi réel** | Twilio (SMS), Brevo (email), passerelle HTTP pour un agrégateur local ; `pnpm verifier:production` ; `/api/sante` ; dossier `docs/production/` (ADR 0045). |
| 3. Passages réels des agents | **En attente** | Clé API et accord sur le coût ; mini-essais d'abord. |
| 4. Mathématiques au lycée | **Fait, provisoire** | Seconde, Première et Terminale C et D ; 26 liens de prérequis ; règle des séries (ADR 0047). |
| 5. Pilotage de l'exploitation | **Fait** | Registre des consommations de tous les agents, plafond journalier appliqué à chaque appel, tableau de bord, export agrégé (ADR 0046). |
| 6. Tests, démonstration, bilan | **Fait** | 7 captures ; ce document. |

**Le Jalon 5 sera clos** quand :
- les passages réels des batteries auront atteint les seuils (étape 3) ;
- un premier envoi réel de SMS et d'email aura été fait vers l'équipe ;
- vos décisions sur les points D1 à D9 de la revue de sécurité auront été appliquées.

## 2. Défauts trouvés en cours de route (tous corrigés)

- **Accord parental** : un élève du Gabon pouvait se déclarer majeur en modifiant le formulaire. La base impose maintenant la règle du pack.
- **Jetons d'accord** : ils étaient rendus à la session de l'élève. Seul le service de messagerie les émet désormais.
- **Coûts** : le plafond journalier ignorait tous les appels directs au modèle. Le registre couvre maintenant chaque appel.
- **Tuteur** : il pouvait proposer un chapitre d'une autre série. La règle des séries s'applique désormais au pack, à la base, au Coordinateur et au Tuteur.
- **Réseau lent** : une question tapée avant que la page soit prête était perdue. Le champ attend maintenant la page.
- **Copies hors ligne** : une copie ancienne pouvait remplacer une copie récente. Les copies sont maintenant ordonnées.
- **Portabilité** (Jalon 4, rappel) : la FAQ des visiteurs était figée sur le premier pays.

## 3. Démonstration (captures sur téléphone, données et agents simulés)

Index et commande de régénération : [`docs/demo/jalon-5/README.md`](../demo/jalon-5/README.md).

| | Écran |
|---|---|
| 01 | [Inscription : accord d'un parent toujours demandé au Gabon](../demo/jalon-5/01-inscription-accord-parental-impose.png) |
| 02 | [Hors connexion : chapitre relu, question gardée](../demo/jalon-5/02-hors-ligne-chapitre-et-question-gardee.png) |
| 03 | [Hors connexion : chapitres enregistrés](../demo/jalon-5/03-hors-ligne-chapitres-enregistres.png) |
| 04 | [Retour du réseau : question envoyée](../demo/jalon-5/04-retour-du-reseau-question-envoyee.png) |
| 05 | [Lycée : Terminale D](../demo/jalon-5/05-lycee-terminale-d-catalogue.png) |
| 06 | [Lycée : le Tuteur remonte à la Seconde](../demo/jalon-5/06-lycee-tuteur-remonte-a-la-seconde.png) |
| 07 | [Administration : pilotage de l'exploitation](../demo/jalon-5/07-administration-pilotage-exploitation.png) |

## 4. Ce que vérifient les tests

| Série | Nombre | Commande |
|---|---|---|
| Tests unitaires (dont contrats des fournisseurs, configuration de production, indicateurs) | 197 | `pnpm test` |
| Base de données (jalons 1 à 4, plus S01-S06, X01-X02, G04) | 94 scénarios | `pnpm test:base` |
| Bout en bout sur téléphone simulé (dont hors ligne, poids des pages, réseau lent, exploitation, lycée) | 63 | `pnpm test:e2e` |
| Agents, mécanique sans coût | inchangés : Professeur, Évaluateur et Coordinateur gardent leurs scénarios non conformes connus en simulation ; les autres sont conformes | `pnpm test:agents [--agent …]` |

## 5. Coûts

| Poste | Estimation | Statut |
|---|---|---|
| Passages réels complets de toutes les batteries (5 exécutions par scénario) | ~105,4 USD | Non lancés : clé et accord attendus |
| Fonctionnement | Plafond par agent et par jour (`COUT_JOUR_MAX_AGENT_USD`, 50 USD par défaut), maintenant appliqué à tous les appels ; suivi sur `/administration/exploitation` | Budget du pilote à approuver |
| SMS | ~0,31 USD par SMS avec Twilio vers le Gabon (relevé d'octobre) | Fournisseur à choisir |

## 6. Décisions et actions attendues du propriétaire

1. **Clé API** (dans l'environnement, jamais dans la conversation) et accord sur le coût des mini-essais, puis des passages complets.
2. **Revue de sécurité, points D1 à D9** (`docs/securite/revue-jalon-5.md` §3), en particulier :
   - D1 : fermer l'API de données de Supabase ;
   - D2 et D3 : résumés après suppression d'un compte, et durées de conservation, avec le juriste.
3. **Fournisseurs et hébergement** (`docs/production/` §1), et approbation des modèles de messages aux parents et aux candidats.
4. **Juriste** : dossier du pilote, Recruteur, durées de conservation, région des données.
5. **Référent de Maths** : programmes du collège et du lycée, répartition Première/Terminale, graphe de prérequis (70 liens).
