# 0123 — Plan du Jalon 26 : mises à jour proposées par Dependabot

- **Date** : 2026-11-19 · **Statut** : validé par le propriétaire

## Contexte

Depuis la fusion dans `main` (ADR 0122), Dependabot a ouvert cinq demandes de mise à jour (n° 3 à 7) :

- une est rouge : la page des liens de prérequis dépasse son budget de poids d'1 Ko ;
- trois sont des versions majeures : bibliothèque Anthropic, TypeScript, types de Node.js.

## Décision

Plan `docs/plans/jalon-26.md` :

1. mises à jour mineures et actions, avec la page trop lourde allégée ;
2. TypeScript 6, et des types de Node.js alignés sur la version de production (22), pas 26 ;
3. bibliothèque Anthropic 1.x, adaptée et testée en simulation ; appel réel seulement avec la clé ;
4. passages réels dès la clé ;
5. demande de fusion vers `main` et bilan.

Aucun budget de poids n'est relevé sans décision du propriétaire (D19 si besoin). Claude Code ne fusionne aucune demande.

Écartés pour ce jalon : les textes et heures du pays, l'accessibilité revue, la pause.

## Conséquences

- Les demandes de Dependabot se ferment d'elles-mêmes quand les versions arrivent dans `main`.
