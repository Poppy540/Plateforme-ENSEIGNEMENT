# 0111 — Inventaire de portabilité : le mot du pays pour les séries

- **Date** : 2026-11-10 · **Statut** : appliqué (Jalon 22, étape 1)

## Contexte

L'inventaire du Jalon 22 (`docs/portabilite/inventaire-jalon-22.md`) a relevé ce qui, depuis le Jalon 4, supposait le Gabon dans le code. Le principal écart : le mot « série » était écrit dans cinq pages. Or le pays fictif Z parle d'« options », et d'autres pays parlent de « filières » ou de « sections ».

## Décision

1. **Le mot vient du pack** : `appellation_series: {singulier, pluriel}` dans `structure.yaml`, facultatif. Il est importé dans `referentiels` (migration 0050, colonnes `appellation_serie`, `appellation_series`). `mes_classes()` le rend aussi. Sans lui, le mot générique « série » (`src/lib/pack-pays/appellation.ts`).
2. Les étiquettes affichent le nom seul (« Série », « Option »). Un possessif (« Ta ») ne s'accorde pas avec tous les mots (« ton option »).
3. Le choix de série ne s'affiche que pour un pays qui a des séries.
4. Les autres écarts (exemples, institution, scripts) sont rendus génériques.
5. Le test de garde cherche aussi les noms de classes du pilote et l'IPN, et couvre `scripts/`.
6. Le fuseau horaire est traité à l'étape 4, avec la règle « un déploiement, un pays ».

## Conséquences

- Réimporter un pack (`pnpm pack:sql`) remplit le mot. Une base déjà en place affiche « série » d'ici là, comme avant.
- Le formulaire d'inscription s'étiquette « Série » au lieu de « Ta série ».
