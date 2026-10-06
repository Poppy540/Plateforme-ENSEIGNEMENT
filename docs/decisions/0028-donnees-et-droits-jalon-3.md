# 0028 — Données et droits du Jalon 3 (Tuteur, Support/inscription, Orchestrateur)

- **Date** : 2026-10-06 · **Statut** : technique, conforme au §5.2 et à l'ADR 0027
- **Migration** : `application/supabase/migrations/20261006000013_jalon_3.sql` · **Tests** : `supabase/tests/47_tests_jalon_3.sql` (J01 à J05)

## Décision

1. **Préférences de l'élève** (temps disponible par jour, qualité de connexion, rappels) : l'élève lit et modifie les siennes ; **rappels désactivés par défaut** ; le Tuteur les lit pour l'élève du contexte.
2. **Tuteur** (`agent_tuteur`) : lit le catalogue validé, le graphe de prérequis validé, la progression, les scores et les préférences **de l'élève fixé par le serveur** ; écrit des recommandations (au plus trois priorités, imposé par la base, non modifiables) et des signalements. Il lit l'existence et l'état des consentements de l'élève, **jamais le contact du parent** (l'envoi passe par la messagerie de la plateforme).
3. **Rapports aux parents** : la base refuse tout rapport sans consentement « rapport_parents » **accordé et non révoqué** de cet élève (celui de l'inscription ne suffit pas) ; l'élève voit les rapports envoyés à ses parents.
4. **Support** (`agent_support`) : lit seulement le statut d'inscription de l'utilisateur du contexte ; ouvre des tickets et des signalements pour lui seul ; la base met tout ticket « détresse » en priorité 1. Aucun accès à la progression ni aux contenus. L'utilisateur voit ses tickets, l'administration les traite.
5. **Orchestrateur** (`agent_orchestrateur`) : file de tâches (agent cible, entrées, priorité, tentatives, profondeur de chaîne contre les boucles, coût, approbation exigée), état des agents (il peut **suspendre**, jamais **réactiver** : réservé à l'administration), journal d'audit pseudonymisé (rôle + empreinte de l'identifiant). Il lit les approbations et l'état des scripts et vidéos (sans leur contenu) et la file des signalements (sans leur texte) ; aucun accès aux élèves.
6. **Export « Mes données »** étendu aux préférences, recommandations, rapports aux parents et tickets ; la suppression du compte les efface en cascade (tickets : demandeur effacé).
