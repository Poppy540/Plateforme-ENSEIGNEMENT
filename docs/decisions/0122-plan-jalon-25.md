# 0122 — Plan du Jalon 25 : fusion de la branche de travail dans `main`

- **Date** : 2026-11-19 · **Statut** : validé par le propriétaire

## Contexte

Les Jalons 1 à 24 sont sur la branche de travail. `main` a 179 commits de retard et aucun commit propre : la fusion se fera sans conflit. Tant qu'elle n'est pas faite, les protections du dépôt public (`SECURITY.md`, Dependabot, CodeQL) ne s'appliquent pas au code réel, et le dépôt montre un squelette périmé.

## Décision

Plan `docs/plans/jalon-25.md` :

1. ouvrir la demande de fusion vers `main` après une dernière vérification, et s'abonner à ses événements ;
2. la suivre jusqu'au vert, en corrigeant ce que GitHub signale ;
3. après la fusion, que **seul le propriétaire fait**, vérifier les protections sur `main` ;
4. passages réels dès la clé ;
5. bilan.

Claude Code ne fusionne pas, n'approuve pas et ne réécrit pas l'historique.

Écartés pour ce jalon : les textes et heures du pays, l'accessibilité revue, la pause.

## Conséquences

- Après la fusion, la branche de travail repart de `main` ; une nouvelle demande de fusion sera ouverte à la demande du propriétaire.
