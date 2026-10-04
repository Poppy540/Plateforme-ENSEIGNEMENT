# Application web (PWA)

Next.js + TypeScript, mobile-first, en français (ADR 0011 et 0012). Données fictives uniquement en développement.

## Commandes (depuis `application/`)

| Commande                               | Rôle                                                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                         | Installer les dépendances                                                                                                          |
| `pnpm dev`                             | Serveur de développement (http://localhost:3000)                                                                                   |
| `pnpm lint`                            | Analyse statique (ESLint)                                                                                                          |
| `pnpm format` / `pnpm format:verifier` | Formatage (Prettier)                                                                                                               |
| `pnpm typecheck`                       | Génération des types de routes puis vérification TypeScript                                                                        |
| `pnpm test`                            | Tests unitaires (Vitest, fichiers `src/**/*.test.ts`)                                                                              |
| `pnpm test:e2e`                        | Tests de bout en bout sur téléphone simulé (Playwright, `tests/bout-en-bout/`) ; construit et lance l'application sur le port 3100 |

Dans l'environnement cloud, Chromium est déjà installé : `CHEMIN_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome pnpm test:e2e`.

`AGENTS.md` et `CLAUDE.md` de ce dossier sont générés par Next.js (consignes pour les agents de code) ; les règles du projet sont dans le `CLAUDE.md` à la racine du dépôt.
