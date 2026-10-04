# Plan du Jalon 2

**Objectif (prompt maître §7)** : chaîne Scénariste → validation humaine → Production vidéo → Évaluateur, et **une seule vidéo complète** pour mesurer le coût et la qualité.

**Statut** : validé (chaîne programmée, ADR 0020). Étape 1 faite (ADR 0021). Étape 2 faite sans clé, modèle simulé (ADR 0022). Étape 3 faite (ADR 0023). Le Jalon 1 reste ouvert sur un point (passage réel des tests TC + PR, en attente de la clé API). Les étapes 1 à 4 peuvent avancer sans clé ni fournisseur, avec des modèles et services simulés ; aucune dépense sans accord.

## Étapes

| # | Étape | Contenu | Besoin du propriétaire |
|---|---|---|---|
| 1 | Données et droits | Tables `scripts`, `videos`, `quiz`, `tentatives_quiz` avec statut, version et empreinte ; validations tracées dans `approbations` (scripts, vidéos, quiz). Rôles `agent_scenariste` (scripts au statut brouillon), `agent_production_video` (lit les scripts **validés** seulement, écrit des vidéos « à relire »), `agent_evaluateur` (quiz brouillon, scores ; ne modifie jamais un score enregistré). Publication : par un humain uniquement. | — |
| 2 | Agent Scénariste | Prompt du cadrage (C1) + skills `script-pense-a-voix-haute`, `ancrage-local`, `contenu-non-fiable`. Sortie structurée : sections minutées, texte parlé, indications visuelles, glossaire, liste [À VÉRIFIER]. Lancé par le référent depuis son espace (« générer un brouillon »). Batterie SC (7 scénarios). | Clé API pour les essais réels |
| 3 | Validation des scripts | Espace référent : lecture du script, points [À VÉRIFIER] mis en évidence, sujets sensibles signalés « à relire en priorité », valider ou rejeter avec commentaire ; tout changement crée une nouvelle version à revalider. | — |
| 4 | Agent Évaluateur | Prompt C3 + skill `questions-de-controle` : quiz brouillon (distracteurs fondés sur des erreurs d'élèves, double vérification), validation par le référent, passage du quiz par l'élève, correction avec la méthode, score enregistré une seule fois, statistiques d'erreurs anonymisées. Batterie EV (8 scénarios). | Clé API pour les essais réels |
| 5 | Production vidéo | Chaîne (décision à prendre, voir ci-dessous) : vérifier statut, version et empreinte du script → voix → avatar → sous-titres français synchronisés (depuis le texte validé) → contrôles (durée, fidélité) → version faible débit → dépôt « à relire » et coût consigné ; budget par vidéo bloquant ; 3 tentatives au plus par segment. Batterie VP (8 scénarios). | Choix des fournisseurs, comptes créés par le propriétaire, clés dans `secrets/production-video.env`, budget par vidéo |
| 6 | Revue et publication de la vidéo | Le référent regarde la vidéo et la valide ; la publication est un acte humain distinct. Lecteur adapté au faible débit (240p ou 360p par défaut, qualité adaptative). | — |
| 7 | Vidéo pilote | Une vidéo complète « Théorème de Thalès » (Maths 3e) : coût réel mesuré poste par poste, qualité relue par le référent, comparée au budget. | Accord de dépense, idéalement un vrai référent |
| 8 | Tests et clôture | Lanceur étendu aux agents Scénariste, Production vidéo, Évaluateur ; bilan du Jalon 2. | Accord sur le coût des passages réels |

## Décisions à prendre avec le propriétaire

1. **Production vidéo : agent ou chaîne programmée ?** Les étapes de production (vérifier, découper, appeler les services, contrôler, déposer) sont mécaniques. Proposition : une **chaîne programmée** (fiable, testable, coût prévisible) qui applique toutes les règles du prompt C2 et ne fait appel à un modèle de langage que pour le rapport d'anomalies. Le prompt C2 reste la référence des règles et la batterie VP s'applique à la chaîne.
2. **Avatar** : personnage **synthétique** du catalogue du fournisseur (aucune personne réelle, aucun clonage de voix ou de visage) pour le pilote.
3. **Fournisseurs et budget par vidéo** : comparatif chiffré dans `docs/fournisseurs-2026-10.md` (chiffres à revérifier avant tout engagement).
4. **Vidéo pilote** : relue par un vrai enseignant-référent, ou par le propriétaire à titre exceptionnel pour mesurer le coût ?

## Hors Jalon 2

Tuteur, Support/inscription, Orchestrateur, pilote avec une classe partenaire (Jalon 3) ; autres unités ; Recruteur ; second pays.
