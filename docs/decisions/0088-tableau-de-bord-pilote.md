# 0088 — Tableau de bord du pilote

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 15, étape 1).

## Contexte

Le pilote est outillé sur une dizaine de pages d'administration : conditions, critères, journal, semaine, rapport de fin, clôture, sort des données. Rien ne disait, d'un coup d'œil, où en est le pilote ni quoi faire ensuite.

## Décision

1. **Phase déduite des données** (`phaseDuPilote`, fonction pure) :

   | Phase                            | Quand                                                         |
   | -------------------------------- | ------------------------------------------------------------- |
   | Préparation                      | Pas de période saisie, ou premier jour à venir.               |
   | Pilote en cours                  | Du premier jour jusqu'au dernier inclus, ou sans date de fin. |
   | Pilote terminé, clôture en cours | Dernier jour passé, gestes de clôture pas tous faits.         |
   | Pilote clôturé                   | Dernier jour passé, clôture complète (8 / 8, ADR 0085).       |

2. **Prochaine action, avec son lien** :
   - Préparation : la première condition non remplie. Une fois les 12 remplies, saisir les dates, puis la date de début est rappelée.
   - Pilote en cours : un critère atteint d'abord, avec son action ; sinon les critères à examiner ; sinon le point de la semaine et le journal.
   - Pilote terminé : le premier geste de clôture à faire. Si c'est le rapport, le lien mène au rapport de fin.
   - Pilote clôturé : le sort des données, à voir avec le juriste.
3. **Page `/administration/tableau-de-bord`** :
   - la phase et la période ;
   - un encadré « Prochaine action » ;
   - les quatre étapes, avec l'étape actuelle marquée (`aria-current="step"`) et le décompte de chacune : conditions N / 12 ; critères atteints et à examiner ; gestes N / 8.
   - Pendant le pilote, trois chiffres des 7 derniers jours : élèves actifs (« <5 » sous 5), quiz passés, signalements.
4. **En tête de `/administration`** : un encadré « Pilote : phase », avec la prochaine action, un lien « Faire maintenant » et « Voir le tableau de bord ». Les liens portent un nom distinct de ceux du menu, pour ne pas créer deux liens au même nom.
5. **Aucune nouvelle règle** : le tableau de bord ne fait que lire les fonctions existantes (conditions, critères, période, clôture). Les pages détaillées restent la référence.

## Tests

- Unitaires : les quatre phases et leurs limites (dernier jour inclus), prochaine action de chaque phase, première condition à remplir, critère atteint prioritaire, premier geste de clôture, sort des données.
- Bout en bout : encadré en tête de l'administration, puis passage de la préparation au pilote en cours et au pilote terminé selon la période ; lien de la prochaine action ; accessibilité.
