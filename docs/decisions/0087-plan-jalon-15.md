# 0087 — Plan du Jalon 15 : tableau de bord du pilote

- **Date** : 2026-10-28 · **Statut** : validé par le propriétaire

## Contexte

Les Jalons 12 à 14 ont outillé le pilote : conditions, critères, journal, rapports, clôture, sort des données. Cela fait une dizaine de pages d'administration. Les demandes faites au propriétaire sont réparties dans les bilans des Jalons 6 à 14 : il est difficile de savoir où en est le pilote et ce qu'il reste à faire. Par ailleurs, les tableaux du rapport de fin défilent de côté sur téléphone.

## Décision

Plan `docs/plans/jalon-15.md` :

1. tableau de bord du pilote : phase déduite des données, décompte de la phase, prochaine action ;
2. liste unique de ce qui attend le propriétaire, calculée quand la plateforme le permet ;
3. rapport de fin en cartes sur téléphone ;
4. passages réels dès la clé ;
5. démonstration et bilan.

Écartés pour ce jalon : la commande unique de contrôles locaux, la skill « faible débit », une nouvelle matière.

## Conséquences

- Pas de nouvelle règle du pilote : le tableau de bord ne fait que lire l'existant (conditions, critères, période, clôture).
- Les bilans renvoient désormais à `docs/attentes-proprietaire.md` au lieu de répéter leurs listes d'attentes.
