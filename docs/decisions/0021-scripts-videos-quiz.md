# 0021 — Scripts, vidéos, quiz : versions figées et validation humaine en base

- **Date** : 2026-10-04 · **Statut** : technique, conforme au cadrage (validation humaine avant toute publication)
- **Migration** : `application/supabase/migrations/20261004000009_scripts_videos_quiz.sql` · **Tests** : `supabase/tests/43_tests_contenus.sql` (C01 à C07)

## Décision

1. **Contenu figé.** Un script ou un quiz ne se modifie jamais : la base calcule la version (suivante pour le chapitre) et l'empreinte (SHA-256 du contenu), impose le statut « brouillon » à la création et refuse toute modification autre que le statut. Un changement = une nouvelle version, à revalider.
2. **Validation** par `valider_contenu(type, id, décision, version relue, commentaire)` : seulement un enseignant-référent de la famille de matières, seulement la version relue, une seule décision par version, tracée dans `approbations` (version + empreinte).
3. **Production vidéo** (rôle `agent_production_video`, chaîne programmée de l'ADR 0020) : ne voit que les scripts validés ; une vidéo n'est acceptée que si le script est validé **et** que la version et l'empreinte déclarées sont exactement celles validées ; la vidéo est toujours déposée « à relire ».
4. **Publication** : `publier_video` par un référent, seulement après validation de la vidéo ; acte distinct tracé (`publication_video`). Aucun agent ne peut valider ni publier.
5. **Scénariste et Évaluateur** n'écrivent des brouillons que pour les chapitres **validés de leur unité** (pas pour les prérequis d'autres unités, qu'ils peuvent seulement lire). Le champ `cree_par` doit correspondre au rôle.
6. **Scores** : l'Évaluateur écrit une tentative seulement pour l'élève fixé par le serveur (`app.eleve_id`), sur un quiz validé ; aucune modification ni suppression d'un score (pas de droit `update`/`delete`).
7. **Les élèves ne lisent jamais la table des quiz** (elle contient les réponses) : les questions leur seront servies sans réponses par une fonction dédiée (étape 4). Ils voient les vidéos publiées des chapitres validés et leurs propres tentatives, qui figurent dans l'export « Mes données ».

## Conséquences

- La suppression d'un compte efface ses tentatives en cascade (ADR 0019).
- Un script ayant une vidéo ne peut pas être supprimé (`on delete restrict`) : l'historique de ce qui a été produit reste vérifiable.
