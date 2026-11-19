# 0106 — Dependabot, CodeQL, actions épinglées, SECURITY.md

- **Date** : 2026-11-03 · **Statut** : accepté (Jalon 20, étape 2)

## Contexte

Le dépôt est public. Trois manques restaient après l'audit des dépendances (ADR 0105) :

- aucune proposition automatique de mise à jour ;
- aucune analyse automatique du code ;
- aucune consigne pour signaler une faille.

Par ailleurs, les flux GitHub utilisaient des actions désignées par une étiquette (`@v4`). Une étiquette peut être déplacée, par l'auteur de l'action ou par quelqu'un qui aurait pris son compte, pour pointer vers un autre code.

## Décision

- **Actions épinglées** : chaque `uses:` des flux est fixé à l'empreinte d'un commit, avec sa version en commentaire :
  - `actions/checkout` v4.4.0 ;
  - `pnpm/action-setup` v4.3.0 ;
  - `actions/setup-node` v4.4.0 ;
  - `actions/upload-artifact` v4.6.2 ;
  - `github/codeql-action` v3.39.1.

  Un test unitaire (`flux-github.test.ts`) refuse toute action non épinglée et tout flux sans droits déclarés en lecture.

- **CodeQL** (`.github/workflows/codeql.yml`), gratuit pour un dépôt public :
  - analyse du TypeScript de `application/src` et `application/scripts`, requêtes « security-extended » ;
  - à chaque envoi sur la branche principale et sur les branches de travail, à chaque demande de fusion, et le lundi.
- **Dependabot** (`.github/dependabot.yml`) :
  - propositions de mise à jour hebdomadaires, le lundi, heure de Libreville ;
  - mises à jour mineures et correctives regroupées, pour les paquets de l'application et pour les actions ;
  - chaque proposition passe le contrôle complet de GitHub Actions avant qu'un humain décide de la fusion ;
  - les mises à jour majeures restent soumises à l'accord du propriétaire (ADR 0104).
- **SECURITY.md**, à la racine : signalement privé par GitHub, informations utiles, données fictives seulement, délais (accusé de réception en 3 jours ouvrés, évaluation en 10).

## Conséquences

- Le signalement privé et les alertes Dependabot doivent être **activés par le propriétaire** dans les réglages de GitHub (étape 3).
- Dependabot ouvrira des demandes de fusion : elles ne sont jamais fusionnées sans contrôle vert et sans décision humaine.
