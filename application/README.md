# Application web (PWA)

Next.js + TypeScript, mobile-first, en français (ADR 0011 et 0012). Données fictives uniquement en développement.

## Commandes (depuis `application/`)

| Commande                               | Rôle                                                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install`                         | Installer les dépendances                                                                                                                                                                  |
| `pnpm controler [--rapide] [--liste]`  | **Tous les contrôles en une commande** (ADR 0095) : outils vérifiés d'abord ; `--rapide` avant chaque envoi, complet avant chaque déploiement ; rapport daté dans `.controles/` (ADR 0096) |
| `pnpm mesurer:pages`                   | Poids et temps de toutes les pages en 3G lente et 2G, processeur ralenti ; rapport dans `docs/performance/` (ADR 0098, 0099)                                                               |
| `pnpm controler:installer [--retirer]` | Facultatif : crochet git qui lance `pnpm controler --rapide` avant chaque `git push` (passer outre : `git push --no-verify` ; ADR 0097)                                                    |
| `pnpm dev`                             | Serveur de développement (http://localhost:3000)                                                                                                                                           |
| `pnpm lint`                            | Analyse statique (ESLint)                                                                                                                                                                  |
| `pnpm format` / `pnpm format:verifier` | Formatage (Prettier)                                                                                                                                                                       |
| `pnpm typecheck`                       | Génération des types de routes puis vérification TypeScript                                                                                                                                |
| `pnpm test`                            | Tests unitaires (Vitest, fichiers `src/**/*.test.ts`)                                                                                                                                      |
| `pnpm test:e2e`                        | Tests de bout en bout sur téléphone simulé (Playwright, `tests/bout-en-bout/`) ; construit et lance l'application sur le port 3100                                                         |

## Lancer l'application en local

```
bash scripts/base-locale.sh demarrer        # Postgres local + migrations + pack pilote + pays fictif zz (données fictives)
ENVIRONNEMENT=developpement MODE_AUTH=simulation \
URL_BASE_DONNEES=postgresql://serveur_application@127.0.0.1:54330/postgres pnpm dev
```

Professeur simulé (`MODE_MODELE=simulation`) : réponses scriptées, aucun appel à l'API. Avec `MODE_MODELE=anthropic`, il faut `ANTHROPIC_API_KEY` dans l'environnement (jamais dans un fichier du dépôt) ; chaque question est facturée.

Connexion simulée : n'importe quel numéro au format international (par exemple `+999 000 000 01`), code `123456`. Les messages qui seraient envoyés (lien de validation du parent) s'affichent sur `/developpement/messages`. `bash scripts/base-locale.sh arreter` arrête la base ; `reinitialiser` la recrée.

Dans l'environnement cloud, Chromium est déjà installé : `CHEMIN_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome pnpm test:e2e`.

`AGENTS.md` et `CLAUDE.md` de ce dossier sont générés par Next.js (consignes pour les agents de code) ; les règles du projet sont dans le `CLAUDE.md` à la racine du dépôt.
