# 0083 — Plan du Jalon 14 : fin du pilote

- **Date** : 2026-10-28 · **Statut** : validé par le propriétaire

## Contexte

La plateforme outille la décision de démarrer le pilote (12 conditions, ADR 0078) et son suivi chaque semaine (critères, journal, rapport hebdomadaire, ADR 0080 à 0082). La fin du pilote, en revanche, n'existe que dans `docs/pilote/procedure.md` (« Après ») : questionnaires de fin, rapport, décision, sort des données. Rien ne la relie à l'état de la plateforme ni ne trace la clôture.

## Décision

Plan `docs/plans/jalon-14.md` :

1. période du pilote et rapport de fin agrégé, en version équipe et en version établissement ;
2. clôture en gestes vérifiés ou cochés avec preuve, décompte, décision finale au journal ;
3. sort des données simulé selon les durées du pack, sans aucun effacement nouveau ;
4. passages réels dès la clé ;
5. démonstration sur un pilote fictif de 4 semaines, puis bilan.

Écartés pour ce jalon : la commande unique de contrôles locaux, la skill « faible débit », une nouvelle matière.

## Conséquences

- De nouvelles tables (période du pilote, gestes de clôture) et des fonctions d'administration, tracées dans le journal d'audit.
- Le rapport de fin reprend le calcul du rapport hebdomadaire, semaine par semaine : les mêmes règles de diffusion s'appliquent (moins de 5 : « <5 »).
- Aucune donnée n'est effacée par ce jalon. La seule suppression reste la purge planifiée existante, et seulement quand les durées sont validées par le juriste (ADR 0049).
