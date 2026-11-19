# 0116 — « Ce qui vous attend » par ordre d'urgence

- **Date** : 2026-11-11 · **Statut** : appliqué (Jalon 23, étape 1)

## Contexte

La liste unique des attentes du propriétaire (ADR 0089) datait du Jalon 15. Elle était rangée par thème (juriste, cadre, référents, agents, hébergement), sans dire ce qui pressait, qui agissait ni combien de temps cela prenait. Les bilans des Jalons 16 à 22 avaient ajouté des demandes ; elles n'y figuraient pas. Les voici :

- la paire de clés `age` ;
- la lettre au juriste ;
- les documents du pilote à compléter ;
- la fusion dans `main` ;
- la question des heures du journal.

## Décision

1. La liste est rangée **par urgence**, en cinq groupes :
   - maintenant (ce qui prend le plus de temps ou débloque le reste) ;
   - avant de déployer ;
   - avant de démarrer ;
   - pendant et après ;
   - facultatif.
2. Chaque point dit **qui** agit et **le temps indicatif** (celui du propriétaire, puis l'attente d'une autre personne), en plus de ce qu'il débloque et d'où agir.
3. Deux points nouveaux :
   - `documents_pilote` : « Qui appeler », adresse du site, liste du jour J ;
   - `heures_journal` : question facultative du Jalon 22.

   Les demandes des Jalons 16 à 21 sont versées dans les points existants (`age` dans l'hébergement, lettre dans le juriste, fusion dans GitHub, prise en main dans les référents).

4. La page de l'administration et `docs/attentes-proprietaire.md` montrent la même liste **dans le même ordre** : le test vérifie désormais l'ordre, plus seulement la présence.

## Conséquences

- La page « Ce qui vous attend » affiche « Qui » et « Temps indicatif » sur chaque carte.
- Le dossier du pilote renvoie à la liste ; le guide de mise en route y renvoyait déjà.
- Les temps sont des estimations de Claude Code, à corriger par le propriétaire à l'usage.
