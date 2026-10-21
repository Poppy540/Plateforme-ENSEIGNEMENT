# 0053 — Plan du Jalon 7 : élèves d'abord, vidéo prête à brancher, Français 3e

- **Date** : 2026-10-21 · **Statut** : validé par le propriétaire

## Contexte

Le Jalon 6 est fait en simulation, sauf les passages réels qui attendent la clé API. Les 12 conditions du pilote attendent surtout le propriétaire : juriste, référents, fournisseurs, hébergement. Ce qui ne dépend pas de lui :
- l'accessibilité n'a jamais été auditée ;
- la vidéo et le journal d'erreurs ne sont pas prêts à brancher ;
- aucune matière littéraire n'existe.

## Décision

Plan `docs/plans/jalon-7.md` :
- étape 1 (accessibilité WCAG 2.1 AA, avec `@axe-core/playwright` en dépendance de test, version épinglée) d'abord ;
- puis l'adaptateur Cloudflare Stream et un adaptateur d'avatar générique, sans rien souscrire ;
- puis un journal d'erreurs nettoyé de toute donnée personnelle ;
- puis Français 3e, avec un programme provisoire ;
- passages réels dès la clé : mini-essais, puis batteries complètes, chaque coût accepté séparément.

WhatsApp reste hors du jalon.

## Conséquences

- Rien n'est déployé ni souscrit.
- La seule dépendance ajoutée sert aux tests et n'est jamais envoyée aux élèves.
- Les contenus de Français restent « à valider » tant qu'un référent ne les a pas relus.
