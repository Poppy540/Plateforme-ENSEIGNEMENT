# 0098 — Plan du Jalon 18 : faible débit

- **Date** : 2026-10-30 · **Statut** : validé par le propriétaire

## Contexte

L'ADR 0044 a fixé un budget de poids (200 Ko), un temps d'affichage limite et la lecture hors ligne des chapitres. Ces contrôles ne portent que sur cinq pages publiques. Les Jalons 6 à 15 ont ajouté de nombreuses pages pour les élèves, les parents, l'enseignant et le référent, jamais mesurées en conditions de faible débit. Or c'est l'usage réel attendu au Gabon : téléphones d'entrée de gamme, réseau lent, cher et intermittent.

## Décision

Plan `docs/plans/jalon-18.md` :

1. mesurer toutes les pages, par public, sur deux réseaux simulés et un processeur ralenti ;
2. fixer un budget par public, vérifié par les tests de bout en bout et donc par `pnpm controler` ; une page sans budget fait échouer les tests ;
3. alléger ce qui dépasse, gains mesurés ;
4. étendre la lecture hors ligne à ce que l'élève a déjà ouvert ; ce qui peut rester sur un téléphone d'élève mineur est une décision du propriétaire (D14) ;
5. passages réels dès la clé ;
6. bilan.

Écartés pour ce jalon : la preuve d'exportabilité, une nouvelle matière, l'accueil des premiers humains.

## Conséquences

- Les budgets s'appliquent à toutes les pages futures.
- Aucune donnée nouvelle n'est gardée sur l'appareil sans l'accord du propriétaire.
