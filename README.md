# Plateforme d'enseignement — collège et lycée

Cours présentés par des professeurs avatars IA, du collège au lycée, pilotés par des agents IA et validés par des enseignants-référents humains. Pays pilote : le Gabon ; d'autres pays s'ajoutent par un **pack pays**, sans modifier le code.

**État (novembre 2026)** : la plateforme est construite et testée en simulation, avec des données fictives. Rien n'est déployé, aucun élève réel. Le pilote avec une classe attend des démarches humaines : juriste, établissement, référent, clé API, hébergement.

## Par où commencer

| Vous êtes…                      | Lisez d'abord                                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Propriétaire du projet**      | [Ce qui vous attend](docs/attentes-proprietaire.md) (par urgence, avec qui et combien de temps), puis le [guide de mise en route](docs/mise-en-route.md) et le [dossier du pilote](docs/pilote/README.md).          |
| **Enseignant-référent**         | Le [kit de démarrage du référent](docs/pilote/kit-referent/README.md) et le [guide du référent](docs/pilote/guide-referent.md).                                                                                     |
| **Juriste**                     | Le [dossier pour le juriste](docs/juridique/dossier-juriste.md).                                                                                                                                                    |
| **Équipe qui déploie**          | Le [dossier de production](docs/production/README.md) et le [guide du paquet de déploiement](application/deploiement/LISEZ-MOI.md).                                                                                 |
| **Personne qui ajoute un pays** | [Packs pays](referentiels/README.md), section « Ajouter un pays » (`pnpm pack:nouveau`, `pnpm pack:verifier`).                                                                                                      |
| **Développeur, ou Claude Code** | [`CLAUDE.md`](CLAUDE.md) (conventions, commandes, droits), [`memory.md`](memory.md) (mémoire de travail), [l'application](application/README.md). Avant chaque envoi : `cd application && pnpm controler --rapide`. |

Signaler une faille de sécurité : [`SECURITY.md`](SECURITY.md).

## Carte du dépôt

| Dossier ou fichier                                                                                                                     | Contenu                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [`docs/cadrage.md`](docs/cadrage.md)                                                                                                   | Document de cadrage : **fait foi**.                                                                   |
| [`docs/prompt-claude-code.md`](docs/prompt-claude-code.md)                                                                             | Instructions du propriétaire à Claude Code.                                                           |
| [`application/`](application/README.md)                                                                                                | Application web (PWA Next.js), base Supabase (`supabase/migrations/`), scripts d'exploitation, tests. |
| [`agents/`](agents/README.md)                                                                                                          | Les dix agents : prompts (recopiés du cadrage), droits, skills, scénarios de test.                    |
| [`referentiels/`](referentiels/README.md)                                                                                              | Packs pays (`gabon/` pilote, `zz-fictif/` pays fictif de test, `_modele/` pour un nouveau pays).      |
| [`tests/`](tests/README.md)                                                                                                            | Batterie commune des agents et lanceur des passages réels (payants, avec l'accord du propriétaire).   |
| [`docs/decisions/`](docs/decisions)                                                                                                    | Une décision d'architecture par fichier (ADR), numérotées.                                            |
| [`docs/plans/`](docs/plans), [`docs/bilans/`](docs/bilans), [`docs/demo/`](docs/demo)                                                  | Plan, bilan et captures d'écran de chaque jalon (archives datées).                                    |
| [`docs/historique.md`](docs/historique.md)                                                                                             | Journal détaillé de tous les jalons.                                                                  |
| `docs/pilote/`, `docs/juridique/`, `docs/production/`, `docs/securite/`, `docs/performance/`, `docs/portabilite/`, `docs/recrutement/` | Dossiers par thème.                                                                                   |
| `secrets/`                                                                                                                             | Modèles `*.env.example` seulement ; les vraies valeurs ne sont jamais dans le dépôt.                  |
