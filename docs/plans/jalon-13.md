# Plan du Jalon 13 — suivre le pilote en cours

**Statut** : validé par le propriétaire le 2026-10-28 (décisions ci-dessous, ADR 0079).

**Objectif** : qu'une fois le pilote lancé, le propriétaire voie chaque semaine, sans rien calculer à la main, si un critère de suspension est atteint, et qu'il ait un rapport agrégé pour le point hebdomadaire. Toute décision (suspension, reprise) doit être tracée. **Rien n'est déployé ni souscrit dans ce jalon** : tout est construit et essayé avec des données fictives.

**Principes inchangés** :
- données fictives seulement ;
- aucun chiffre pour un groupe de moins de 5 élèves ;
- la plateforme signale, le propriétaire décide : aucune suspension automatique nouvelle ;
- aucun prompt d'agent modifié ;
- les seuils sont des valeurs du pack, à valider, jamais écrites dans le code.

## Étapes (dans cet ordre)

| # | Étape | Contenu | Besoin du propriétaire |
|---|---|---|---|
| 0 | Plan | Ce plan, l'ADR 0079 et `memory.md`. | Validation (faite) |
| 1 | Critères de suspension surveillés | Page « Critères de suspension » dans l'administration, sur le modèle des 12 conditions. Chaque critère de `docs/pilote/criteres-arret.md` a un état : « rien à signaler », « à examiner » ou « atteint ». Ceux que la base peut voir sont **calculés** : détresse non prise en charge dans le délai, erreur de contenu signalée et non traitée depuis plus d'une semaine, plus de 2 contestations sur une même question de quiz, coût de la semaine au-delà du budget hebdomadaire plus 50 %, agent suspendu, accès des élèves fermé. Les autres sont **déclarés** par le propriétaire avec un motif : contenu non validé montré, fuite de données, demande de l'établissement, équipe indisponible. Seuils et délais dans le pack (`pilote` de `pays.yaml`, statut « à valider ») ; un seuil vide = critère non surveillé, et c'est affiché. Quand un critère passe « atteint », l'exécuteur planifié ajoute **une** alerte dans la file humaine, sans donnée d'élève. Tests de base, unitaires et de bout en bout ; accessibilité. | Valider les seuils proposés ; fixer le budget hebdomadaire |
| 2 | Journal du pilote et reprise | Journal des décisions dans l'administration : suspension (agent, accès des élèves), reprise, point hebdomadaire, avec date et motif court (coordonnées masquées). Une **reprise** demande les 4 points de `criteres-arret.md` : cause identifiée, correction faite et testée, accord du propriétaire, établissement informé. Les boutons existants de suspension (ADR 0034) écrivent aussi dans ce journal. Tracé dans le journal d'audit. | — |
| 3 | Rapport hebdomadaire agrégé | Page imprimable « Semaine du pilote ». Elle répond aux 5 questions du protocole de retour d'expérience (usage, aide, agents dans leur rôle, charge de l'équipe, coût) avec les chiffres de la semaine et ceux de la précédente. S'y ajoutent les critères de l'étape 1 et les décisions de l'étape 2. Deux versions : une complète pour l'équipe, une **pour l'établissement**, sans coûts ni détail des agents. Export en texte (Markdown) pour le point hebdomadaire. Seuil de 5 partout. Tests, accessibilité, impression sur téléphone et sur papier. | — |
| 4 | Passages réels des agents | Repris du Jalon 12, étape 5 : dès que la clé, la relecture des skills et l'accord sont là, mini-essais, puis séries complètes (~121 USD) après un nouvel accord. | Clé API ; accord sur chaque coût |
| 5 | Démonstration et bilan | Une semaine de pilote **fictive** jouée de bout en bout : un critère atteint, une suspension, une reprise, puis le rapport de la semaine. Captures et bilan, comme aux jalons précédents. | — |

L'étape 4 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-10-28)

1. **Piste retenue** : suivre le pilote en cours (critères de suspension surveillés, journal du pilote, rapport hebdomadaire agrégé).
2. **Écartés pour ce jalon** :
   - la commande unique de contrôles locaux ;
   - la skill « faible débit » ;
   - une nouvelle matière de 3e.

## Hors Jalon 13

- Le déploiement lui-même et toute souscription.
- Le déblocage de GitHub Actions : réglage du compte, par le propriétaire (bilan du Jalon 12, §7).
- Rapport de fin de pilote et réunion de bilan : le rapport hebdomadaire en donne la matière ; le format final se décidera avec l'établissement.
- Vue par élève pour l'enseignant (après l'avis du juriste).
