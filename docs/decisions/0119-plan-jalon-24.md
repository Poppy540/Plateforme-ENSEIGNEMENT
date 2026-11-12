# 0119 — Plan du Jalon 24 : revue de sécurité des Jalons 16 à 23

- **Date** : 2026-11-12 · **Statut** : validé par le propriétaire

## Contexte

La dernière revue de sécurité date du Jalon 16. Depuis, les Jalons 16 à 23 ont ajouté :

- 4 migrations ;
- le hors ligne étendu sur le téléphone ;
- de nouvelles pages et actions ;
- des scripts qui lisent ou modifient la base ou le dépôt ;
- une chaîne d'intégration sur un dépôt public.

Le pilote accueillera des élèves mineurs.

## Décision

Plan `docs/plans/jalon-24.md` :

1. revue consignée (`docs/securite/revue-jalon-24.md`) sur la grille des Jalons 5 et 16 : base, application, téléphone, scripts, dépôt public ;
2. corrections avec un test chacune, et garde-fous automatiques étendus ;
3. décisions du propriétaire (D17 et suivantes) pour ce qui touche une règle, un comportement visible ou un coût ;
4. passages réels dès la clé ;
5. bilan.

Écartés pour ce jalon : la fusion dans `main`, l'heure du pays partout, la pause.

## Conséquences

- Aucun déploiement ni service payant ; un test d'intrusion par un tiers reste à décider après le déploiement.
