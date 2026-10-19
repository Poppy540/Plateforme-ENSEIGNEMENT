# Plan du Jalon 5 — prêt pour le réel

**Statut** : validé par le propriétaire le 2026-10-20 (décisions ci-dessous, ADR 0042). Étape 0 faite (revue de sécurité, ADR 0043, `docs/securite/revue-jalon-5.md`). Étape 1 faite (hors ligne et réseau lent, ADR 0044).

**Objectif** : le prompt maître (§7) s'arrête au point 5, couvert par le Jalon 4. Le Jalon 5 comble ce qui manque avant d'accueillir de vrais élèves, **sans rien déployer ni payer**. Il étend ensuite la famille Mathématiques au lycée.

**Principe inchangé** : tout reste construit en simulation, avec des données fictives, tant que la clé API, les fournisseurs, le juriste et les référents ne sont pas disponibles. Rien n'est déployé ni souscrit.

## Étapes (dans cet ordre)

| # | Étape | Contenu | Besoin du propriétaire |
|---|---|---|---|
| 0 | Revue de sécurité et de confidentialité | Relecture de bout en bout : règles d'accès en base, routes, sessions, en-têtes, secrets, journaux pseudonymisés, données des mineurs et des candidats. Rapport (`docs/securite/revue-jalon-5.md`), puis corrections et tests ajoutés. | — |
| 1 | Connexions lentes et hors ligne | Budget de poids par page, mesuré par les tests. Service worker : lecture hors ligne des chapitres déjà ouverts, et questions au Professeur mises en file puis envoyées au retour du réseau. Tests sur réseau lent et hors ligne simulés. Aucune donnée d'un autre élève en cache ; tout est effacé à la déconnexion. | — |
| 2 | Fournisseurs prêts à brancher | Interfaces SMS/email avec des tests de contrat ; fournisseur choisi par variable, envoi simulé par défaut. Dossier de mise en production rédigé, **rien n'est déployé** : hébergement, sauvegardes et restauration, purge, déploiement, retour arrière. | Choix des fournisseurs (plus tard) |
| 3 | Passages réels des agents | Dès que la clé et votre accord sont là : **mini-essais** (1 exécution, quelques USD) ; vous voyez les résultats ; puis **batteries complètes** (~105 USD) après un nouvel accord. Je corrige les skills, les entrées et les contrôles du serveur, jamais les prompts sans votre accord. | Clé API ; accord sur chaque coût |
| 5 | Pilotage de l'exploitation | Tableau de bord de l'administration : coût par agent et par jour, délais de la file humaine, alertes de coût, export agrégé pour le retour d'expérience du pilote. | — |
| 4 | Famille Mathématiques au lycée | Seconde, puis Première et Terminale C et D : programmes **provisoires** repris du cadrage (`SOURCES.md` : à valider) ; graphe de prérequis prolongé jusqu'en Terminale, validé lien par lien ; valeurs des agents ; Coordinateur sur toute la famille, de la 6e à la Terminale. | Référent de Maths ; programmes IPN |
| 6 | Tests, démonstration, bilan | Comme aux jalons précédents. | — |

L'étape 3 s'insère dès que la clé arrive. Les étapes 0, 1, 2 et 5 passent avant l'étape 4.

## Décisions du propriétaire (2026-10-20)

1. **Ordre** : la préparation au réel d'abord, l'extension des contenus ensuite.
2. **Contenus** : les Mathématiques au lycée (Seconde, Première et Terminale C et D).
3. **Hors ligne** : lecture des chapitres déjà ouverts et file de questions.
4. **Passages réels** : mini-essais d'abord, puis batteries complètes après un nouvel accord.

## Hors Jalon 5

WhatsApp, paiements (pilote gratuit, ADR 0013), vraies vidéos (fournisseurs), pilote réel (il suit son dossier, `docs/pilote/`), vrai second pays, autres familles de matières.
