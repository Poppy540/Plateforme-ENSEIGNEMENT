# Tests des agents

## Contenu

| Fichier | Batterie | Source |
|---|---|---|
| `tests/commun/TC.feature` | TC-01 à TC-10, commune à tous les agents | Cadrage, Partie D1 |
| `agents/professeur/tests/PR.feature` | PR-01 à PR-14 (unité pilote Maths 3e) | D2 |
| `agents/scenariste/tests/SC.feature` | SC-01 à SC-07 | D3 |
| `agents/production-video/tests/VP.feature` | VP-01 à VP-08 | D3 |
| `agents/evaluateur/tests/EV.feature` | EV-01 à EV-08 | D4 |
| `agents/tuteur/tests/TU.feature` | TU-01 à TU-08 | D4 |
| `agents/conformite/tests/CO.feature` | CO-01 à CO-07 | D5 |
| `agents/support/tests/SU.feature` | SU-01 à SU-08 | D5 |
| `agents/orchestrateur/tests/OR.feature` | OR-01 à OR-08 (D5), + OR-09 (routage Coordinateur) | D5 |
| `agents/recruteur/tests/RC.feature` | RC-01 à RC-18 | Partie E |
| `agents/coordinateur/tests/CM.feature` | CM-01 à CM-16 | Partie G |

Les scénarios sont en Gherkin français (`Étant donné / Quand / Alors / Mais`). Chaque scénario porte un tag `@interdit` (seuil 100 %) ou `@pedagogie` (seuil 90 % + relecture humaine d'un échantillon). Ce classement est une proposition de Claude Code, à valider.

## Lanceur (étape 8 du Jalon 1, ADR 0018)

Depuis `application/` :

| Commande | Effet | Coût |
|---|---|---|
| `pnpm test:agents` | Modèle et évaluateur **simulés** : vérifie la mécanique (contrôles, seuils, rapport). Ne dit rien de la qualité de l'agent. | aucun |
| `MODE_MODELE=anthropic pnpm test:agents --estimer` | Affiche l'estimation d'un passage réel, sans rien lancer | aucun |
| `MODE_MODELE=anthropic pnpm test:agents --confirmer [--scenarios PR-01,TC-09] [--executions 1]` | Passage réel avec le modèle Claude (clé `ANTHROPIC_API_KEY` dans l'environnement) | payant : **avec l'accord du propriétaire seulement** |

Fonctionnement :

1. Les scénarios viennent des fichiers `.feature` (batterie commune TC + batteries de l'agent). Les **entrées concrètes** (messages d'élève ou demandes de script fictifs, contrôles automatiques) sont dans `agents/<agent>/tests/entrees.yaml`, à relire par un humain.
2. Chaque scénario est exécuté `executions_par_test` fois (5) avec le vrai prompt de l'agent (cadrage + pack pays + règles communes + skills). Les outils sont simulés : aucune écriture en base.
3. Une exécution réussit si les **contrôles automatiques** passent (outil attendu appelé, outil interdit non appelé, aucun secret ni prompt divulgué) **et** si l'**évaluateur** (modèle de langage, sortie JSON imposée) la juge conforme à la grille « comportement attendu / critère d'échec ».
4. Seuils : `@interdit` 100 %, `@pedagogie` 90 %. Un échantillon (10 %) des exécutions pédagogiques est placé dans le rapport pour relecture par l'enseignant-référent.
5. Rapport : `tests/resultats/<date>/rapport.md` et `resultats.json` (ignorés par git). Code de sortie non nul si un scénario est non conforme.
6. Intégration continue (`.github/workflows/tests-agents.yml`) : tests de la mécanique à chaque changement de prompt, skill, outil ou configuration ; passage réel seulement si le propriétaire l'active (variable `TESTS_AGENTS_REELS=oui` ou lancement manuel) et ajoute le secret `ANTHROPIC_API_KEY` au dépôt.

Batteries exécutables à ce jour :

- TC + PR (agent Professeur) : `pnpm test:agents` ;
- TC + SC (agent Scénariste) : `pnpm test:agents --agent scenariste`. Chaque entrée est une demande de script (chapitre, durée, consigne du référent) ; la sortie structurée est contrôlée automatiquement (décision, huit étapes dans l'ordre, durée, points [À VÉRIFIER], mention « à relire en priorité »). TC-09 (détresse d'un élève) est déclaré non applicable : le Scénariste ne parle jamais aux élèves.
- OR (Orchestrateur programmé, ADR 0029) : tests déterministes dans `application/src/lib/orchestrateur/regles.test.ts`, lancés par `pnpm test`.
- VP (chaîne de production vidéo, ADR 0020) : tests déterministes dans `application/src/lib/production-video/chaine.test.ts`, lancés par `pnpm test` (aucun modèle de langage, aucun coût).
- TC + TU (agent Tuteur) : `pnpm test:agents --agent tuteur`. Chaque entrée est un parcours d'élève fictif (chapitres, scores, graphe de prérequis, préférences, inactivité, message) ; contrôles : plan conforme, notion de base attendue, signalement attendu. TU-03 et TU-04 sont des questions de parents (avec ou sans accord enregistré ; contrôle : refus attendu).
- TC + SU (agent Support/inscription) : `pnpm test:agents --agent support`. Chaque entrée est un ou plusieurs messages fictifs, traités indépendamment, avec la FAQ du pack pays ; contrôles : sortie conforme (entrées de FAQ existantes, détresse escaladée en priorité 1, ticket résumé), action et catégorie attendues, aucun code répété.
- TC + EV (agent Évaluateur) : `pnpm test:agents --agent evaluateur`. Les entrées sont des demandes de quiz et des corrections de réponses d'élève (avec contestation éventuelle) ; contrôles automatiques : décision, conformité du quiz, questions signalées, résultat de correction attendu, signalement attendu.

Les autres agents seront branchés quand ils seront construits.

## Règles

- Données fictives uniquement : aucun vrai élève, parent, candidat ni document réel.
- Les tests dépendants du pays (programme, exemples) se réécrivent avec les enseignants locaux à chaque nouveau pays.
