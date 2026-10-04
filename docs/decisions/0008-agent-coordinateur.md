# 0008 — Agent Coordinateur de famille de matières (écart E1)

- **Date** : 2026-10-04 · **Statut** : demandée par le propriétaire ; prompt, droits et tests **en brouillon**
- **Contexte** : le cadrage prévoit « un agent coordinateur par famille de matières » pour la continuité de la 6e à la Terminale ; il ne figurait pas dans la liste des neuf agents.
- **Décision** : création d'un **dixième agent**, `agents/coordinateur/`, instancié une fois par famille de matières (6 familles au Gabon, dans `referentiels/gabon/familles.yaml`). Il vérifie la cohérence verticale (progression, prérequis, notations, configurations des Professeurs) et ne fait que des recommandations.
- **Distinction** : la Conformité programme compare au programme officiel ; le Coordinateur vérifie la cohérence interne de la famille d'une classe à l'autre.
- **À faire** : validation du prompt, des droits et des tests CD par le propriétaire ; mise à jour éventuelle du routage de l'Orchestrateur (C7), qui ne peut être modifié que par le propriétaire.
