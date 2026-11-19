# 0041 — Essai de portabilité : pack fictif « zz » à côté du pilote

- **Date** : 2026-10-20 · **Statut** : technique, conforme à l'ADR 0001 (pack pays) et à l'ADR 0035 (second pays = pack fictif seulement)
- **Migration** : 0024 · **Tests** : Y01-Y05 (base), `portabilite.test.ts` (unitaires), `portabilite.spec.ts` (bout en bout)

## Décision

1. **Pack `referentiels/zz-fictif/`** (code pays `zz`, référentiel `zz-general`), tiré de `referentiels/_modele/`. Tout y est inventé. Il est volontairement différent du pilote :
   - quatre « Années » au lieu de sept classes, et des options (Sciences, Humanités) en dernière année au lieu de séries ;
   - un examen fictif, des volumes horaires et des coefficients renseignés ;
   - une majorité à 16 ans (au lieu de « inconnue ») ;
   - sa propre FAQ, son propre recrutement (autres sources, délai de relance de 10 jours, conditions validées) ;
   - les valeurs de tous les agents.
2. **Statut de pack `test`** (migration 0024, lecteur de pack). Le générateur `pack-en-sql` refuse un pack « test » sans l'option `--test`. Seuls `pnpm test:base` et la base locale (`scripts/base-locale.sh`, donc les tests de bout en bout) l'importent. Il n'est **jamais importé en production**.
3. **Aucune modification du code propre à un pays.** L'essai a révélé quatre points, tous corrigés de façon générique :
   - **l'aide sans compte** montrait toujours la FAQ du premier référentiel : une personne non inscrite choisit maintenant le pays (`/aide?referentiel=<code>`), et un élève inscrit voit toujours l'aide de son pays ;
   - **deux skills partagées** (`ancrage-local`, `tri-des-demandes`) citaient le Gabon en exemple, ce qui entrait dans les prompts de tous les pays : exemples rendus neutres ;
   - **les données fictives des tests de base** utilisaient déjà le code `zz` : renommées `xx`, pour que `zz` désigne le seul pack d'essai ;
   - **le modèle `_modele/`** ne listait pas la FAQ, le recrutement ni les valeurs des agents : complété (`agents/README.md` liste les variables de chaque agent).
4. **Tests de non-mélange** :
   - base (Y01-Y05) : import sans lien de prérequis ni série entre pays ; inscription limitée aux classes et options du pays choisi ; validation limitée au pays et à la famille du référent ; Coordinateur, Conformité et Professeur cloisonnés ;
   - unitaires : chaque agent (Professeur, Scénariste, Évaluateur, Tuteur, Support, Conformité, Coordinateur, Recruteur) se configure pour chaque pays sans aucune valeur de l'autre (skills comprises) ; FAQ, familles et recrutement propres ;
   - bout en bout : FAQ par pays sans compte ; élève du pays Z (classes et majorité de son pack, catalogue, Professeur) ; sources de recrutement du pays choisi.

## Limites

- La phrase du prompt de la Conformité « par exemple les séries gabonaises ailleurs » (recopiée du cadrage) reste dans le prompt de tous les pays. C'est un exemple de règle, pas une valeur, et le prompt n'est pas réécrit sans votre accord.
- Les batteries des agents (lanceur) restent écrites pour l'unité pilote ; un vrai second pays demandera des entrées rédigées avec ses enseignants (`tests/README.md`).
- Le choix d'un vrai second pays reste votre décision.
