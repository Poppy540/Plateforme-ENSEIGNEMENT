# Audit des dépendances — Jalon 20, étape 1

**Date** : 2026-11-02 · **Outil** : `pnpm audit` (base des avis de sécurité de GitHub), puis `pnpm audit:dependances` · **Décision** : ADR 0105

## 1. État trouvé

12 failles connues dans les dépendances, directes ou indirectes :

| Paquet                   | Version         | Gravité                        | Failles                                                                                                                             | Atteignable par la plateforme ?                                                                                                                                                                            |
| ------------------------ | --------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **next** (application)   | 16.3.8          | **2 critiques, 1 élevée**      | Exécution de code à distance par l'optimisation d'images et par les fonctions `use cache` ; déni de service par les actions serveur | **Oui pour le déni de service** : la plateforme utilise des actions serveur dans tous ses formulaires. Les deux autres touchent des fonctions qu'elle n'utilise pas, mais elles sont dans le serveur livré |
| vite (via vitest, tests) | 8.3.2           | 1 élevée, 4 modérées, 1 faible | Serveur de développement de Vite et ouverture d'éditeur                                                                             | Non : outil de test, jamais sur le serveur                                                                                                                                                                 |
| zod (via ESLint)         | 4.6.5           | 1 élevée                       | Mémoire épuisée sur de très grandes collections                                                                                     | Non : outil de vérification du code                                                                                                                                                                        |
| minimatch (via ESLint)   | 3.1.5 et 10.2.6 | 2 modérées                     | Déni de service sur des motifs de fichiers                                                                                          | Non : outil de vérification du code ; les motifs sont ceux du dépôt                                                                                                                                        |

## 2. Corrections

Chaque version retenue est la dernière **publiée depuis au moins une semaine**, plutôt que celle du jour.

| Paquet                   | Avant  | Après      | Comment                                                                                                                        |
| ------------------------ | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| next, eslint-config-next | 16.3.8 | **16.4.3** | Mise à jour mineure (même version majeure)                                                                                     |
| vitest                   | 5.0.3  | 5.0.5      | Mise à jour corrective                                                                                                         |
| vite                     | 8.3.2  | 8.3.5      | Déclaré en dépendance de développement : il était installé comme « pair » de vitest, que les règles de forçage ne touchent pas |
| zod                      | 4.6.5  | 4.6.7      | Version forcée (`pnpm.overrides`) pour la dépendance indirecte d'ESLint                                                        |

Après correction, le contrôle complet a réussi (9 contrôles sur 9), budgets de poids des pages compris.

## 3. Ce qui reste, et pourquoi

| Faille              | Paquet                 | Gravité | Exception jusqu'au | Raison                                                                         |
| ------------------- | ---------------------- | ------- | ------------------ | ------------------------------------------------------------------------------ |
| GHSA-g3hv-75wg-m249 | minimatch (via ESLint) | modérée | 2027-01-31         | Outil de développement seulement ; la correction (minimatch 11) casse ESLint 9 |

## 4. Garde-fou

- `pnpm audit:dependances` lance l'audit et le juge :
  - une faille **élevée ou critique** sans exception fait échouer ;
  - une exception **expirée** ou mal écrite fait aussi échouer ;
  - une faille faible ou modérée est signalée ;
  - une exception devenue inutile est signalée.
- Les exceptions vivent dans `application/exceptions-audit.json`, avec l'identifiant de la faille, le paquet, une raison et une date de fin.
- L'audit fait partie de `pnpm controler`, dès le niveau rapide, donc aussi de GitHub Actions et du contrôle avant envoi.
- Il interroge le registre des paquets : sans réseau, il échoue et le dit.
