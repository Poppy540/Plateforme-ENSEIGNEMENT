# Plan du Jalon 4 — montée en charge

**Statut** : validé par le propriétaire le 2026-10-13 (décisions ci-dessous, ADR 0035). Étape 0 faite (alerte de veille simulée, quota en base, libellés des familles ; ADR 0036). Étape 1 faite (Maths 6e-3e provisoires, graphe de prérequis validé lien par lien ; ADR 0037). Étape 2 faite (Coordinateur, modèle simulé ; ADR 0038). Étape 3 faite (Conformité programme, modèle simulé ; ADR 0039). Étape 4 faite (Recruteur, modèle simulé, envoi simulé, données fictives ; ADR 0040). Étape 5 faite (pack fictif `zz` importé à côté du pilote sans modifier le code ; ADR 0041). Étape 6 faite (captures `docs/demo/jalon-4/`, bilan `docs/bilans/jalon-4.md`).

**Objectif (prompt maître §7, point 5)** : « Ensuite seulement : autres unités, Coordinateurs de famille (dès qu'une famille compte plusieurs unités), Recruteur, second pays. » Les trois derniers agents du cadrage (Conformité programme, Coordinateur de famille, Recruteur) sont construits. La plateforme passe d'une unité à une famille complète, et sa portabilité vers un autre pays est démontrée.

**Principe inchangé** : tout est construit **en simulation**, avec des données fictives, tant que la clé API, les fournisseurs, les programmes officiels et les référents ne sont pas disponibles. Rien n'est déployé ni souscrit.

## Étapes

| # | Étape | Contenu | Besoin du propriétaire |
|---|---|---|---|
| 0 | Reliquats du pilote | **Alerte de veille** : une interface fournisseur plus un envoi simulé. Chaque signalement de priorité 1 prévient la personne de veille, sans donnée d'élève dans le message. Une **relance** part si l'alerte n'est pas traitée dans le délai de la procédure. Quota de l'assistant d'aide tenu **en base**. Libellés des familles dans l'espace référent. | Fournisseur SMS/email pour l'envoi réel |
| 1 | Famille Mathématiques au collège | Programmes **6e, 5e et 4e** repris du cadrage, PROVISOIRES (`SOURCES.md` : à valider). Graphe de prérequis **entre classes**, proposé au statut « à valider ». Valeurs des agents par unité dans le pack. Catalogue et Tuteur vérifiés sur quatre unités. | Référent Maths ; programmes IPN |
| 2 | Agent Coordinateur (famille Mathématiques) | Cohérence de la 6e à la 3e : prérequis, notations, glossaire, charte, plans de production, rapports de cohérence. Tout reste au statut **brouillon**, validé par le référent. Il lit seulement des statistiques **agrégées**, ne parle jamais aux élèves et reçoit le routage de l'Orchestrateur (OR-09). Batterie CM (16 scénarios). | Clé API pour les essais réels |
| 3 | Agent Conformité programme | Dépôt d'un document officiel (texte ou PDF) par le propriétaire ou un référent. Le document est traité comme une donnée, jamais comme une instruction. Il produit : une extraction structurée (source, page, statut « officielle / déduite / manquante », confiance) ; un **rapport d'écart** entre le pack et le document ; un classement réutilisable / à adapter / à recréer. Il n'écrit jamais dans le référentiel validé : son brouillon n'entre dans le pack qu'après validation humaine. Batterie CO (7 scénarios). | Programmes IPN pour un usage réel |
| 4 | Agent Recruteur | Pipeline sur données fictives : sources autorisées, fiches minimales, présélection sur critères pédagogiques seulement, brouillons de messages, entretien, dossier d'accord. **L'envoi n'est possible qu'avec une approbation enregistrée** (valideur, date, empreinte du texte). Un texte modifié doit être réapprouvé. La liste d'opposition est vérifiée juste avant l'envoi. Une seule relance. Le propriétaire décide de tout (ADR 0010). Envoi simulé. Batterie RC (18 scénarios). | Avis du juriste (prospection, données des candidats) avant tout usage réel ; fournisseur email et agenda |
| 5 | Second pays : essai de portabilité | Pack **fictif** `zz`, tiré de `referentiels/_modele/`, importé à côté du Gabon **sans modifier le code**. Les tests vérifient : catalogue, inscription, agents, Conformité, aucun mélange entre pays (données, FAQ, valeurs des agents). Le choix d'un vrai second pays reste votre décision, plus tard. | — |
| 6 | Tests, démonstration, bilan | Lanceur étendu aux trois agents ; tests de bout en bout ; captures ; bilan du Jalon 4. | Accord sur le coût des passages réels |

## Décisions du propriétaire (2026-10-13)

1. **Ordre** : Coordinateur, puis Conformité programme, puis Recruteur (l'usage réel du Recruteur attend l'avis du juriste).
2. **Première famille à plusieurs unités** : Mathématiques au collège, de la 6e à la 3e.
3. **Second pays** : un pack fictif de test seulement ; le vrai pays sera choisi plus tard.
4. **Alerte de veille** : construite maintenant avec un envoi simulé ; le fournisseur réel sera branché ensuite.

## Hors Jalon 4

Vraies vidéos (fournisseurs), WhatsApp, paiements, séries du lycée et autres familles de matières, rappels envoyés aux élèves, pilote réel (il suit son propre dossier, `docs/pilote/`).
