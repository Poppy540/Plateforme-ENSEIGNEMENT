# 0107 — Réglages GitHub guidés et vérifiés en lecture seule

- **Date** : 2026-11-03 · **Statut** : accepté (Jalon 20, étape 3)

## Contexte

Certains réglages de sécurité ne se font que dans l'interface de GitHub, par le propriétaire : signalement privé, Dependabot, protection de la branche, approbation des contributeurs externes, adresse email privée. Claude Code n'a pas, et ne doit pas avoir, les droits d'administration du dépôt.

## Décision

- **Guide pas à pas** (`docs/securite/reglages-github.md`) : cinq étapes, avec les libellés exacts des menus. Il contient l'état relevé au 2026-11-03 :
  - analyse des secrets et protection à l'envoi : déjà activées ;
  - signalement privé, mises à jour de sécurité Dependabot, protection de `main` : à faire.
- **`pnpm verifier:depot`** (`src/lib/exploitation/verification-depot.ts`, `scripts/verifier-depot.mts`) :
  - lit, sans jeton et sans rien modifier, ce que l'API publique de GitHub montre du dépôt : réglages de sécurité visibles, signalement privé, protection de la branche principale, présence de `SECURITY.md`, de Dependabot et de CodeQL sur cette branche, adresses email des commits récents ;
  - n'affiche aucune adresse email, seulement un nombre ;
  - passe par le proxy de l'environnement s'il y en a un (`NODE_USE_ENV_PROXY`), et explique une limite de l'API atteinte ;
  - liste ce qui reste à vérifier à la main.
- **Protection de `main`** : demande de fusion obligatoire, avec 0 approbation (un seul responsable), et contrôle « verifications » vert. Ni réécriture ni effacement.

## Conséquences

- Tests unitaires de la vérification (dépôt bien réglé, manques détectés, adresses jamais affichées, limite de l'API, lecture de l'adresse git).
- `SECURITY.md`, Dependabot et CodeQL ne prennent effet qu'après fusion de la branche de travail dans `main`, par une demande de fusion que le propriétaire décide.
