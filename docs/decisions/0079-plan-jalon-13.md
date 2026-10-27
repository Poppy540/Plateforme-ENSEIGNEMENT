# 0079 — Plan du Jalon 13 : suivre le pilote en cours

- **Date** : 2026-10-28 · **Statut** : validé par le propriétaire

## Contexte

Le Jalon 12 a outillé la décision de **démarrer** le pilote (12 conditions). Rien ne suit encore le pilote **une fois lancé** :
- les critères de suspension de `docs/pilote/criteres-arret.md` se vérifient à la main, en croisant la file humaine, les coûts et les quiz ;
- les décisions de suspension et de reprise ne sont notées nulle part de façon structurée ;
- les indicateurs agrégés existent (`/administration/exploitation`), mais pas de synthèse de la semaine pour le point hebdomadaire ou pour l'établissement.

## Décision

Plan `docs/plans/jalon-13.md` :
1. critères de suspension surveillés, calculés en base quand c'est possible, sinon déclarés ; une alerte dans la file humaine quand un critère est atteint ;
2. journal du pilote : suspensions, reprises (avec les 4 points exigés) et points hebdomadaires ;
3. rapport hebdomadaire agrégé, en version équipe et en version établissement ;
4. passages réels dès la clé ;
5. démonstration sur une semaine fictive, puis bilan.

**La plateforme signale, le propriétaire décide** : aucune suspension automatique n'est ajoutée. La suspension d'un agent pour coût anormal par l'Orchestrateur (ADR 0046) reste la seule.

Les seuils et délais (contestations, dépassement du budget, délai de prise en charge d'une détresse, délai de correction d'une erreur, budget hebdomadaire) vont dans le pack pays, avec le statut « à valider ». Un seuil absent rend son critère « non surveillé », et la page le dit.

Écartés pour ce jalon : la commande unique de contrôles locaux, la skill « faible débit », une nouvelle matière.

## Conséquences

- De nouvelles tables (journal du pilote, déclarations de critères) et des fonctions d'administration, toutes tracées dans le journal d'audit.
- Les chiffres restent agrégés, avec le seuil de 5. La version pour l'établissement ne montre ni coûts ni détail des agents.
- Aucune donnée d'élève dans les alertes, le journal ou les rapports ; les textes libres sont débarrassés des coordonnées.
