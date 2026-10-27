# Plan du Jalon 10 — outiller le propriétaire

**Statut** : validé par le propriétaire le 2026-10-27 (décisions ci-dessous, ADR 0065). Étape 1 faite (ADR 0066). Étape 2 faite (ADR 0067). Étape 3 faite (ADR 0068).

**Objectif** : que le propriétaire puisse inviter les référents et créer les classes du pilote **depuis l'administration**, sans commande ni SQL. Ajouter aussi une première skill propre au projet : la protection des élèves mineurs.

**Principe inchangé** : tout est construit en simulation, avec des données fictives. Rien n'est déployé ni souscrit, et aucune dépense n'est faite sans l'accord du propriétaire. Aucun prompt d'agent n'est modifié.

## Étapes (dans cet ordre)

| # | Étape | Contenu | Besoin du propriétaire |
|---|---|---|---|
| 0 | Plan | Ce plan, l'ADR 0065 et `memory.md`. | Validation (faite) |
| 1 | Invitations de référents depuis l'administration | Formulaire dans `/administration` : référentiel, familles de matières, durée. Le code s'affiche **une seule fois**, puis seule son empreinte est gardée. Liste des invitations (en attente, utilisées, expirées), sans les codes ; annulation d'une invitation en attente. Tout est tracé dans le journal d'audit. Réservé à l'administration (règles d'accès en base). La commande `pnpm referent:invitation` reste disponible. | — |
| 2 | Classes depuis l'administration | Formulaire : référentiel, niveau, série, nom, établissement. Les deux codes (classe, enseignant) s'affichent une seule fois. Liste des classes avec le nombre d'élèves rattachés et l'état de l'invitation. Possible aussi : nouveau code de classe (l'ancien cesse de marcher), nouvelle invitation d'enseignant, annulation. Un rappel indique qu'aucune classe réelle n'est créée avant l'avis du juriste (Q19). Mêmes garanties que l'étape 1. | Avis du juriste avant usage réel |
| 3 | Skill « élèves mineurs » | Skill commune `agents/_commun/skills/eleves-mineurs`, ajoutée au Professeur, à l'Évaluateur, au Tuteur et au Support : ton adapté à l'âge ; aucune donnée personnelle demandée ; jamais de rendez-vous, de contact privé ni de secret entre l'agent et l'élève ; renvoi vers un adulte de confiance ; détresse toujours signalée. Origine et statut « à valider » dans `SOURCES.md`. Batteries simulées relancées, et un scénario commun ajouté (demande de contact privé). | Relecture de la skill avant les passages réels |
| 4 | Passages réels des agents | Dès que la clé et l'accord sont là : mini-essais, puis séries complètes (~115 USD, plus le nouveau scénario) après un nouvel accord. | Clé API ; accord sur chaque coût |
| 5 | Démonstration et bilan | Captures des écrans d'administration ; bilan comme aux jalons précédents. | — |

L'étape 4 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-10-27)

1. **Ordre** : outiller le propriétaire d'abord (invitations et classes depuis l'administration), puis les skills.
2. **Skills** : seulement « élèves mineurs » dans ce jalon.
3. **Contenus** : aucune nouvelle matière.

## Hors Jalon 10

- Skills « faible débit » et « files d'approbation » (à proposer plus tard).
- Données individuelles d'élèves pour l'enseignant (après l'avis du juriste seulement).
- Nouvelle matière, WhatsApp, paiements, mise en production, pilote réel.
