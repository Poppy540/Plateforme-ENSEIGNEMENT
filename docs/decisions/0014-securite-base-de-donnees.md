# 0014 — Sécurité de la base de données

- **Date** : 2026-10-04 · **Statut** : appliquée (Jalon 1, étape 2)
- **Principe** : tout est fermé par défaut (sécurité au niveau des lignes sur toutes les tables, droits retirés), puis on ouvre le strict nécessaire.
- **Élèves** : chacun ne lit que ses propres données (profil, élève, consentements, progression). Aucune écriture directe : inscription par `inscrire_eleve()`.
- **Mineurs** : compte « en attente » jusqu'à la confirmation d'un parent ou tuteur par un jeton à usage unique, stocké seulement sous forme d'empreinte (`confirmer_consentement_parent()`).
- **Catalogue** : lisible par tous, mais seuls les chapitres **validés** sont visibles ; l'enseignant-référent voit aussi ceux de sa famille à valider.
- **Validation** : uniquement par `valider_chapitre()`, réservée au référent de la famille de matières, pour la **version relue** ; chaque décision est tracée dans `approbations` (valideur, date, version, empreinte). Toute modification du contenu d'un chapitre le repasse « à valider » avec une nouvelle version.
- **Agent Professeur** : rôle `agent_professeur` sans droit de validation ; il ne lit que les chapitres validés de son unité (et leurs prérequis validés) et la progression de l'élève connecté, fixés par le serveur à chaque transaction (`app.eleve_id`, `app.unite_id`). Il écrit la progression et des signalements dans ce seul périmètre. La détresse est toujours en priorité 1.
- **Tests** : `application/supabase/tests/` (14 scénarios), lancés par `pnpm test:base` sur un Postgres local jetable et en intégration continue.
