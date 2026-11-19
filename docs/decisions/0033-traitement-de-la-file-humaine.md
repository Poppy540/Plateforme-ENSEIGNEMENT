# 0033 — Traitement de la file humaine par l'administration

- **Date** : 2026-10-07 · **Statut** : technique, complète les ADR 0029 (Orchestrateur) et 0032 (Support)
- **Migration** : 0017 · **Tests** : F01-F02 (base), bout en bout (administration)

## Contexte

Les signalements (détresse, contenu, alertes de l'Orchestrateur) et les tickets du Support arrivaient dans la file humaine de `/administration`, mais personne ne pouvait les clore : la file aurait grossi sans fin pendant le pilote.

## Décision

1. **Signalement** : « Marquer comme traité » (date et traitant enregistrés). **Ticket** : « Prendre en charge » (en cours), puis « Marquer comme résolu ».
2. **Règles en base** : seule l'administration traite ; le traitant enregistré est toujours la personne connectée ; un élément traité ou résolu ne peut pas être rouvert ; le contenu (résumé, priorité, motif) n'est pas modifiable.
3. Chaque décision est inscrite au **journal d'audit** (acteur pseudonymisé).
4. La plateforme ne fait que tracer : une détresse appelle d'abord une **action humaine hors de la plateforme**, décrite dans la procédure du pilote (étape 7).

## Limites

- Pas de réponse écrite au demandeur depuis l'administration : elle passera par la messagerie approuvée quand le fournisseur sera choisi.
- Les référents ne traitent pas encore les signalements de leurs chapitres (lecture seulement).
