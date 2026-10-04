# 0005 — Prompt modèle et valeurs par unité (écart E5)

- **Date** : 2026-10-04 · **Statut** : validée par le propriétaire
- **Contexte** : la Partie B contient, dans le prompt, les valeurs de l'unité pilote Maths 3e Gabon.
- **Décision** : `agents/professeur/prompt.md` est recopié tel quel. Les valeurs sont **aussi** stockées dans `referentiels/gabon/agents/professeur/ga-3e-mathematiques.yaml` et injectées dans les variables `{{...}}`. Le chargeur de prompt ignore la section « VALEURS POUR L'UNITÉ PILOTE ».
