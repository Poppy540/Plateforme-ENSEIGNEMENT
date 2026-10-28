# 0086 — Sort des données en fin de pilote : simulation seulement

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 14, étape 3).

## Contexte

En fin de pilote, les familles gardent leur compte ou le suppriment. Les durées de conservation du pack s'appliquent ensuite par la purge planifiée (ADR 0019, 0049). Ces durées sont **provisoires** tant que le juriste ne les a pas validées. Pour la réunion de bilan, le propriétaire doit pouvoir dire ce qui sera effacé et quand. Il ne doit rien effacer de nouveau.

## Décision

1. **Page `/administration/donnees`** (lien « Sort des données ») : pour chaque pays du pilote (pays des chapitres du pilote), un tableau de 7 catégories, reprises des purges existantes :
   - échanges avec le professeur IA ;
   - inscriptions jamais acceptées ;
   - comptes sans activité ;
   - signalements traités ;
   - tickets résolus ;
   - rapports aux parents ;
   - candidats clos.
2. **Chaque catégorie** montre sa règle, sa durée (ou « non fixée »), le nombre actuel, ce que la purge effacerait si elle passait aujourd'hui, et la date prévue : dernier jour du pilote plus la durée. Une durée vide affiche « rien n'est effacé ». Les effectifs de personnes de 1 à 4 s'affichent « <5 ».
3. **Rappel de l'avis du juriste** : la page dit si la condition 1 du pilote (avis du juriste, ADR 0078) est cochée. Tant qu'elle ne l'est pas, les durées restent provisoires.
4. **Rien n'est effacé** : `simulation_sort_donnees(pays)` (migration 0046, administration seulement) ne fait que compter. Ses règles sont celles de `purger_donnees_expirees` et de `purger_donnees_etendues`. La purge planifiée reste la seule à effacer.
5. **Documents** : la procédure du pilote (« Après ») renvoie à cette page. La fiche d'information gagne une section « Après l'essai » : garder ou supprimer le compte, effacement après les durées, entre crochets et à confirmer par le juriste, et bilan sans nom.

## Conséquences

- Si une catégorie de purge est ajoutée, elle doit l'être aussi à la simulation, sinon la page sous-estime ce qui sera effacé.
- La date prévue pour les comptes sans activité suppose qu'ils ne servent plus après le pilote. Un compte gardé et utilisé repousse sa date.

## Tests

- Base : SD01 (administration seulement, pays inconnu refusé), SD02 (7 catégories ; durée vide, rien à effacer ; avec une durée, un échange ancien compté) et SD03 (la simulation n'efface rien).
- Unitaires : date prévue, libellés, effectifs masqués, durée non fixée.
- Bout en bout : page, durées du pack pilote, date prévue, aucune ligne effacée, accessibilité.
