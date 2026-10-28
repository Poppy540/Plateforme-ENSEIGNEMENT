# Captures du Jalon 14

Un pilote **fictif** de 4 semaines, sur téléphone simulé : 10 élèves fictifs, de 2 à 8 actifs selon les semaines. On y voit la période saisie, le rapport de fin, la décision d'arrêt, la mise en veille, les gestes de clôture et la simulation du sort des données. Aucun élève réel ; rien n'est effacé.

Régénérables avec `cd application && pnpm demo:captures tests/demo/jalon-14.spec.ts`, puis `bash scripts/compresser-captures.sh ../docs/demo/jalon-14`.

| #   | Capture                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------- |
| 01  | [Période du pilote : premier et dernier jour](01-periode-du-pilote.png)                                                 |
| 02  | [Rapport de fin, version équipe : total et 4 semaines, les 5 questions](02-rapport-fin-version-equipe.png)              |
| 03  | [Rapport de fin, version établissement : sans coûts ni détail des agents](03-rapport-fin-version-etablissement.png)     |
| 04  | [Clôture : décision d'arrêt notée, mise en veille encore à faire](04-cloture-decision-arret-mise-en-veille-a-faire.png) |
| 05  | [Clôture complète : 8 / 8 gestes faits](05-cloture-complete.png)                                                        |
| 06  | [Sort des données : simulation selon les durées du pack, rien n'est effacé](06-sort-des-donnees-simulation.png)         |

Le champ de date suit la langue du navigateur : format anglais dans le navigateur des captures, format français chez les utilisateurs francophones. Sur téléphone, les tableaux du rapport de fin (total et une colonne par semaine) défilent horizontalement.
