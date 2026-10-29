# 0090 — Rapport de fin lisible sur téléphone

- **Date** : 2026-10-29 · **Statut** : appliqué (Jalon 15, étape 3).

## Contexte

Les tableaux du rapport de fin (ADR 0084) ont une colonne « Indicateur », une colonne « Total » et une colonne par semaine. Sur téléphone, ils défilaient de côté : la valeur de la dernière semaine n'était visible qu'en faisant glisser chaque tableau. C'est la limite notée au bilan du Jalon 14.

## Décision

1. **Deux formes du même contenu** :
   - le tableau, sur grand écran et à l'impression ;
   - une **carte par indicateur** sur un écran de 40 rem de large ou moins, soit la largeur d'un téléphone. La carte donne le libellé de l'indicateur, puis le total et chaque semaine en paires terme et valeur (`dl`), sur une grille qui passe à la ligne.
2. **Une seule forme visible à la fois**, choisie par le CSS (`.tableau-large`, `.rapport-cartes`). La forme masquée est en `display: none`, donc absente pour les lecteurs d'écran : aucun doublon n'est lu. À l'impression, le tableau revient toujours.
3. **Le rapport de la semaine ne change pas** : ses tableaux n'ont que 3 colonnes (indicateur, semaine, précédente) et tiennent sur un téléphone, comme le montrent les captures du Jalon 13.
4. Le contenu, les règles de diffusion (« <5 ») et le fichier texte ne changent pas.

## Tests

Bout en bout :

- sur téléphone (Pixel 7), 6 cartes pour la première question, avec les termes « Total », « Sem. 1 », « Sem. 2 », « Sem. 3 », et le tableau masqué ;
- en impression (média `print`), le tableau et ses en-têtes, sans les cartes ;
- sur grand écran, le tableau sans les cartes ;
- l'audit d'accessibilité reste vert.
