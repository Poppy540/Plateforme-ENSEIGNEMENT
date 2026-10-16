# 0038 — Agent Coordinateur de famille : revue de cohérence en brouillon, décisions du référent

- **Date** : 2026-10-16 · **Statut** : technique, conforme au prompt du Coordinateur (Partie G), au §5.2 et à l'ADR 0035 · construit sans clé API (modèle simulé)
- **Migration** : 0021 · **Tests** : K01-K04 (base), unitaires, lanceur (25 scénarios TC + CM, TC-09 non applicable), bout en bout (`coordinateur.spec.ts`)

## Décision

1. **Rôle de base `agent_coordinateur`**, limité à **sa famille** dans **son référentiel**, tous deux fixés par le serveur (`app.famille`, `app.referentiel_id`).
   - Il lit le catalogue, les chapitres et les liens de la famille (tous statuts) et les scripts et quiz **validés**.
   - Il lit des statistiques **agrégées** (`statistiques_famille`), seulement pour les quiz d'au moins 5 tentatives. Ce seuil ne peut pas être abaissé ; les quiz plus petits sont seulement comptés.
   - Aucune donnée d'élève n'est lisible (élèves, progression, tentatives, échanges : refus de la base).
2. **Revue de cohérence** demandée par un référent de la famille depuis son espace, avec une consigne facultative traitée comme une donnée.
   - Elle passe par l'**Orchestrateur** : type `coherence_famille`, routage OR-09, file de tâches, suspension et coût.
   - Le serveur fournit les données de la famille, des constats automatiques (chapitres isolés, liens validés vers des chapitres non validés, quiz trop petits) et un ordre compatible avec les prérequis. Les contenus sont isolés comme données non fiables.
3. **Sortie imposée par schéma** : refus, constats (type, gravité, confiance, alerte immédiate), liens proposés, glossaire, plan de production, classement universel / adaptable / local, trois décisions au plus, synthèse.
4. **Contrôles du serveur** : sont écartés et tracés avec le rapport tout lien vers un chapitre inconnu, d'une classe supérieure, créant un cycle ou déjà présent, et tout plan qui place un chapitre avant son prérequis.
5. **Rapport enregistré au statut brouillon**, avec une version par famille ; son contenu est figé.
   - Une alerte immédiate (erreur factuelle publiée, sujet sensible, instruction cachée) crée un signalement dans la file humaine.
6. **Décisions du référent**, vérifiées par la base : seul un référent de la famille décide.
   - **Accepter un lien** : il devient un lien **validé**, si le référent couvre les deux chapitres, sans cycle ni classe supérieure.
   - **Écarter une proposition**, avec une remarque obligatoire.
   - **Adopter le glossaire** comme **charte de la famille** (versionnée, relue par le Coordinateur aux revues suivantes).
   - **Clore le rapport.**
7. **Une instance par famille** : valeurs du prompt dans `referentiels/<pays>/agents/coordinateur/<famille>.yaml` (6 familles pour le Gabon), avec la skill de la famille (`skill_famille`) en plus des 11 skills communes.

## Limites

- En simulation, le Coordinateur ne comprend pas le contenu : CM-02 (notation), CM-12 (hors programme) et CM-16 (erreur factuelle) restent non conformes. Seul un passage réel (~22 USD pour la batterie complète) dira sa qualité.
- Les transcriptions de vidéos ne sont pas encore fournies au Coordinateur (scripts et quiz validés seulement).
- Pas encore d'analyse planifiée : la revue est lancée par le référent.
