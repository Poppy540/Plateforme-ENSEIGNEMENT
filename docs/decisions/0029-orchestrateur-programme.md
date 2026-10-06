# 0029 — Orchestrateur programmé et file de tâches

- **Date** : 2026-10-06 · **Statut** : technique, conforme à l'ADR 0027 (chaîne programmée validée) et au prompt de l'Orchestrateur
- **Code** : `application/src/lib/orchestrateur/regles.ts` (règles pures, batterie OR), `application/src/lib/serveur/orchestrateur.ts` (file, exécuteur) · **Migration** : 0014 · **Tests** : OR-01 à OR-09, O01-O02, bout en bout

## Décision

1. **Demandes structurées** : le serveur transmet à l'Orchestrateur des demandes typées (question de cours, création de script ou de quiz, production vidéo, plan de révision, rapport aux parents, inscription, recrutement, cohérence de famille, détresse, demande de droits…). Le texte d'un utilisateur n'est qu'une donnée rangée à part (`donnees_non_fiables`) pour l'agent destinataire : il ne change jamais le routage, les droits ni la création de tâches.
2. **Routage par règles** : Professeur de l'unité trouvée dans le pack pays (classe, série, matière ; question de précision si aucune unité ne correspond) ; Scénariste, Évaluateur, Production vidéo, Tuteur, Conformité, Support, Recruteur, Coordinateur de la famille ; détresse → humain en priorité 1 ; demande inconnue → humain ; demande d'élargissement de droits → refus et alerte.
3. **Validations humaines vérifiées dans la base** (approbation valide, même version et même empreinte), à la création de la tâche **et** au moment de l'exécuter ; sinon la tâche est « bloquée » et la validation relancée. Une affirmation (« c'est validé ») n'est jamais transmise.
4. **File de tâches** : traitement par priorité puis ancienneté ; un agent suspendu n'exécute rien (tâches « suspendues ») ; 3 tentatives au plus puis échec et alerte ; profondeur de chaîne limitée à 3 (boucle coupée et alerte) ; coût quotidien d'un agent au-delà de `COUT_JOUR_MAX_AGENT_USD` (50 USD par défaut) → suspension et alerte immédiate.
5. **Exécution** : en production, un planificateur appelle `POST /api/orchestrateur/executer` avec le jeton `JETON_EXECUTEUR` (sans jeton, l'exécuteur est désactivé) ; en développement et test, `MODE_FILE=immediat` traite la tâche juste après la demande. La **production vidéo passe désormais par la file** ; les générations de scripts et de quiz y seront branchées avec les vrais modèles.
6. **Administration** (`/administration`, rôle administrateur) : état des agents et réactivation (réservée par la base à l'administration ; les tâches suspendues repartent), file humaine (signalements et tickets, la détresse d'abord), tâches récentes. Journal d'audit pseudonymisé (rôle + empreinte salée de l'identifiant, `SEL_AUDIT`).

## Limites

- Pas encore de classification de demandes libres par un modèle (prévue seulement pour les demandes ambiguës) : une demande libre non typée va à un humain.
- Les comptes d'administration sont créés par le propriétaire (aucune inscription en ligne).
