# 0035 — Jalon 4 : montée en charge, décisions du propriétaire

- **Date** : 2026-10-13 · **Statut** : validée par le propriétaire · plan : `docs/plans/jalon-4.md`

## Contexte

Les jalons 1 à 3 sont construits en simulation. Le prompt maître (§7, point 5) prévoit ensuite : autres unités, Coordinateurs de famille (dès qu'une famille compte plusieurs unités), Recruteur, second pays.

## Décisions

1. **Ordre des agents** : Coordinateur de famille, puis Conformité programme, puis Recruteur. L'usage réel du Recruteur (prospection, données de candidats) attend l'avis du juriste au Gabon.
2. **Première famille à plusieurs unités** : Mathématiques au collège (6e, 5e, 4e, 3e). Les programmes de 6e à 4e sont repris du cadrage, **provisoires**, à valider par un référent et à confronter aux programmes officiels de l'IPN.
3. **Second pays** : un pack **fictif** de test (`zz`), pour démontrer la portabilité sans modifier le code. Le choix d'un vrai second pays reste au propriétaire.
4. **Alerte de veille** (condition préalable n° 8 du pilote) : construite maintenant avec un envoi simulé, derrière une interface de fournisseur ; l'envoi réel attend le fournisseur SMS ou email.

## Conséquences

Tout reste en simulation, sur données fictives ; aucun déploiement, aucun service payant. Chaque nouvel agent reçoit son rôle de base limité au §5.2, sa batterie de tests (CM, CO, RC) dans le lanceur, et une ADR.
