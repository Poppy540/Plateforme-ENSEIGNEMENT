# Plan du Jalon 3

**Objectif (prompt maître §7)** : agents Tuteur, Support/inscription et Orchestrateur ; pilote avec une classe partenaire.

**Statut** : validé par le propriétaire le 2026-10-06 (décisions ci-dessous, ADR 0027). Étape 1 faite (ADR 0028). Tout se construit **en simulation** (modèle simulé, messagerie simulée, aucun fournisseur) tant que la clé API et les fournisseurs ne sont pas disponibles. Le pilote avec de vrais élèves n'aura lieu qu'après les conditions de l'étape 7.

## Étapes

| # | Étape | Contenu | Besoin du propriétaire |
|---|---|---|---|
| 1 | Données et droits | File de tâches (agent cible, entrées vérifiées, priorité, statut, tentatives, coût, preuve d'approbation) ; journal d'audit pseudonymisé ; recommandations du Tuteur ; rapports aux parents (brouillon puis envoyé) ; préférences de l'élève (temps disponible, connexion, rappels) ; tickets de support ; rôles `agent_tuteur`, `agent_support`, `agent_orchestrateur` limités au §5.2. | — |
| 2 | Orchestrateur et file de tâches | Routage par règles (unité de l'élève, type de demande) ; vérification des approbations **en base** avant toute étape qui suit une validation ; priorités (détresse d'abord) ; limites d'échanges et de coût ; suspension d'une tâche ou d'un agent et alerte ; exécuteur de tâches qui reprend les productions longues (vidéo, scripts, quiz) hors de la requête du référent. Tableau de suivi pour l'administration. Batterie OR (9 scénarios). | Décision 1 |
| 3 | Agent Tuteur | Plan de révision : au plus trois priorités (chapitre, raison, temps estimé), en remontant le graphe de prérequis validé depuis les échecs aux quiz et la progression ; adapté au temps disponible et à la connexion ; encouragements fondés sur des progrès réels. Détection d'inactivité : message bienveillant + signalement à un humain. Page « Mon plan » pour l'élève. Batterie TU (8 scénarios). | Clé API pour les essais réels |
| 4 | Rapports aux parents | Uniquement avec le consentement « rapports aux parents » **enregistré** (demandé au parent par un lien à usage unique, révocable) ; rapport factuel sans comparaison ; envoi par la messagerie approuvée (simulée) avec un modèle de message ; refus et procédure expliquée sinon. | Décision 3 |
| 5 | Agent Support/inscription | Aide sur le site : inscription, connexion, choix de classe et de série d'après le pack pays, FAQ **validée** (dans le pack pays), tickets quand la réponse n'est pas dans la FAQ ; jamais de code SMS ni de mot de passe ; escalade (paiement, suppression, usurpation, détresse). Batterie SU (8 scénarios). WhatsApp plus tard. | Décision 2, FAQ à valider |
| 6 | Tests et démonstration | Lanceur étendu aux trois agents ; tests de bout en bout ; captures du parcours. | Accord sur le coût des passages réels |
| 7 | Pilote avec une classe partenaire | **Préparation seulement** : procédure, consentements des parents, fiche d'information, protocole de retour d'expérience, critères d'arrêt. Le pilote réel exige : avis du juriste au Gabon, un référent validé, la clé API, l'hébergement choisi et un premier contenu validé. | Juriste, référent, classe partenaire, hébergement |
| 8 | Bilan du Jalon 3 | — | — |

## Décisions du propriétaire (2026-10-06)

1. **Orchestrateur : chaîne programmée** (validé). Comme pour la production vidéo (ADR 0020), une **chaîne programmée** (règles de routage, vérifications en base, priorités, limites) ; un modèle de langage ne sert qu'à classer une demande libre ambiguë, jamais à décider d'une validation. La batterie OR s'applique au code.
2. **Canal du Support** : le **site d'abord** (validé) ; WhatsApp Business plus tard (fournisseur, coûts, modèles de messages approuvés par Meta).
3. **Rapports aux parents** : **hebdomadaire et à la demande du parent** (validé), canal (celui du contact parent déjà enregistré, SMS ou email), consentement séparé de celui de l'inscription.
4. **Rappels à l'élève** : désactivés par défaut, activables par l'élève (validé).

## Hors Jalon 3

Autres unités, Coordinateurs de famille, Recruteur, Conformité programme, second pays.
