# 0104 — Plan du Jalon 20 : sécurité du dépôt public

- **Date** : 2026-11-02 · **Statut** : validé par le propriétaire

## Contexte

Le dépôt est public depuis le Jalon 18. L'historique ne contient aucun secret. Mais rien ne surveille encore les dépendances (failles connues), rien n'analyse le code automatiquement, et rien n'indique comment signaler une faille. Les réglages de sécurité de GitHub (analyse des secrets, protection de la branche, approbation des contributeurs externes) restent à faire par le propriétaire.

## Décision

Plan `docs/plans/jalon-20.md` :

1. audit des dépendances, corrections vérifiées par `pnpm controler`, et audit ajouté au contrôle ;
2. Dependabot, CodeQL, actions épinglées par empreinte, SECURITY.md ;
3. guide des réglages GitHub pour le propriétaire, et vérification en lecture seule (`pnpm verifier:depot`) ;
4. passages réels dès la clé ;
5. bilan.

Écartés pour ce jalon : le programme du pilote complet, la preuve d'exportabilité, une nouvelle matière.

## Conséquences

- Seuls des outils gratuits pour un dépôt public sont utilisés.
- Une mise à jour qui change une version majeure de dépendance passe par l'accord du propriétaire.
