# 0094 — Plan du Jalon 17 : contrôle local unique

- **Date** : 2026-10-30 · **Statut** : validé par le propriétaire

## Contexte

GitHub Actions ne démarre plus depuis le 19 octobre : aucune machine n'est attribuée aux tâches, c'est un réglage du compte. Les contrôles du projet sont nombreux et dispersés en neuf commandes, avec des bases locales à démarrer et un navigateur à indiquer. Ils ne sont donc lancés que lorsqu'on y pense. Au Jalon 16, c'est la répétition générale qui a trouvé une régression du Jalon 15 ; elle aurait pu passer inaperçue.

## Décision

Plan `docs/plans/jalon-17.md` :

1. une commande `pnpm controler`, qui vérifie d'abord les outils, puis lance tous les contrôles, en deux niveaux (rapide pour chaque envoi, complet pour chaque déploiement) ;
2. un rapport Markdown daté par passage, sans aucune valeur de variable d'environnement, gardé sur la machine ; le paquet de déploiement note le dernier contrôle complet du commit, sans rien refuser ;
3. branchements : intégration continue sur la même commande, crochet avant envoi facultatif, documentation ; exiger ou non un contrôle complet avant le déploiement est un choix du propriétaire ;
4. passages réels dès la clé ;
5. bilan.

Écartés pour ce jalon : la preuve d'exportabilité avec un pack pays fictif, la skill « faible débit », une nouvelle matière.

## Conséquences

- Un seul endroit à tenir pour la liste des contrôles, en local comme en intégration continue.
- Aucune dépendance nouvelle : la commande enchaîne les scripts existants.
- Aucune règle du pilote ne change sans l'accord du propriétaire.
