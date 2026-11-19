# 0036 — Alerte de veille et quota de l'assistant d'aide en base

- **Date** : 2026-10-13 · **Statut** : technique, décidé par le propriétaire (ADR 0035, point 4) · envoi **simulé** tant que le fournisseur SMS/email n'est pas choisi
- **Migration** : 0019 · **Tests** : W01-W04 (base), unitaires (`veille.test.ts`), bout en bout (`support.spec.ts`)

## Décision

1. **Inscription par la base** : tout signalement ou ticket de **priorité 1** est inscrit dans `alertes_veille` par un déclencheur. Cela vaut quel que soit l'agent qui l'a créé, et la détresse est toujours en priorité 1. Aucun chemin du code ne peut l'oublier.
2. **Envoi par le service de messagerie** (`alertes_veille_a_envoyer`, rôle `service_messagerie` seulement) :
   - un message **groupé** par passage, à chaque contact de `CONTACTS_VEILLE` ;
   - le message ne contient que le nombre d'éléments, leurs motifs et le lien vers `/administration` : **aucune donnée d'élève** (ni prénom, ni identifiant, ni contact, ni résumé).
3. **Quand** :
   - tout de suite après la création d'un signalement (Professeur, Évaluateur, Tuteur, Support, Orchestrateur), sans jamais faire échouer la demande de l'élève ;
   - puis à chaque passage de l'exécuteur planifié, avant toute autre tâche.
4. **Relance** : tant que l'élément n'est ni traité (signalement) ni pris en charge (ticket), une relance « RELANCE — » part toutes les `ALERTE_RELANCE_MINUTES` (120 par défaut), au plus `ALERTE_RELANCES_MAX` fois (3 par défaut).
5. **Quota de l'assistant d'aide** tenu en base (`prendre_quota_support`, rôle `agent_support`, pour la personne fixée par le serveur), au lieu de la mémoire du serveur : il reste juste avec plusieurs instances. Les jours passés sont effacés au passage.
6. **Espace référent** : les familles s'affichent avec leur libellé, lu dans `familles.yaml` du pack du pays.

## Exploitation

- L'exécuteur planifié (`POST /api/orchestrateur/executer`) doit être appelé **au moins toutes les 5 minutes** pour que les relances soient à l'heure.
- `CONTACTS_VEILLE` contient les numéros ou emails de l'équipe de veille. C'est une donnée personnelle de l'équipe : elle est renseignée dans l'environnement par le propriétaire, **jamais dans le dépôt**.
- Sans contact configuré, les alertes restent dans `/administration` et une erreur sans donnée est journalisée.
- Une alerte est marquée envoyée avant l'envoi : un échec d'envoi est rattrapé par la relance suivante.
