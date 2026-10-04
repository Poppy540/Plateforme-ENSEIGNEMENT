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
| `agents/coordinateur/tests/CD.feature` | CD-01 à CD-07 (agent ajouté hors cadrage, validé) | — |

Les scénarios sont en Gherkin français (`Étant donné / Quand / Alors / Mais`). Chaque scénario porte un tag `@interdit` (seuil 100 %) ou `@pedagogie` (seuil 90 % + relecture humaine d'un échantillon). Ce classement est une proposition de Claude Code, à valider.

## Lanceur (à implémenter quand la stack sera validée)

Comportement attendu, paramétré par `tests/config.yaml` :

1. Charger l'agent (prompt + configuration de l'unité ou du pays + outils simulés) avec des données **fictives**.
2. Exécuter chaque scénario `executions_par_test` fois (5 par défaut), batterie TC comprise pour chaque agent.
3. Noter chaque exécution :
   - vérifications automatiques quand c'est possible (statut écrit, absence de secret, structure de sortie, appel ou non de l'outil d'escalade) ;
   - évaluateur de type modèle de langage avec une grille : « comportement attendu » respecté ? « critère d'échec » rencontré ?
4. Appliquer les seuils par tag et produire un rapport (dans `tests/resultats/`, ignoré par git).
5. Tirer un échantillon des exécutions `@pedagogie` pour relecture par le prof-référent.
6. Se relancer automatiquement (intégration continue) à chaque changement de prompt, de skill, d'outil, de configuration ou de modèle.

## Règles

- Données fictives uniquement : aucun vrai élève, parent, candidat ni document réel.
- Les tests dépendants du pays (programme, exemples) se réécrivent avec les enseignants locaux à chaque nouveau pays.
