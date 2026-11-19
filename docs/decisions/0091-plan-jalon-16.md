# 0091 — Plan du Jalon 16 : revue de sécurité des Jalons 9 à 15

- **Date** : 2026-10-29 · **Statut** : validé par le propriétaire

## Contexte

La revue de sécurité du Jalon 5 (ADR 0043) a conduit aux décisions D1 à D9 (ADR 0049). Depuis, les Jalons 9 à 15 ont ajouté beaucoup de surface :

- rôle enseignant ;
- codes d'invitation et de classe ;
- une vingtaine de fonctions d'administration en `security definer` ;
- textes libres ;
- exports ;
- outils d'exploitation.

Elle n'a pas été relue d'un seul tenant, alors que le premier déploiement approche.

## Décision

Plan `docs/plans/jalon-16.md` :

1. revue consignée dans `docs/securite/revue-jalon-16.md`, sur la grille du Jalon 5, avec des constats classés ;
2. corrections sans décision, chacune avec un test, et garde-fous automatiques dans les tests de base (fonctions `security definer` : `search_path` fixé, aucun droit d'exécution pour `public` ni `anon` hors liste blanche) ;
3. décisions du propriétaire pour ce qui touche une règle, un comportement ou un coût ;
4. passages réels dès la clé ;
5. bilan.

Écartés pour ce jalon : la commande unique de contrôles locaux, la skill « faible débit », une nouvelle matière.

## Conséquences

- Les garde-fous automatiques s'appliquent à toutes les migrations futures : un oubli de droit fait échouer `pnpm test:base`.
- Aucune règle du pilote ne change sans l'accord du propriétaire.
