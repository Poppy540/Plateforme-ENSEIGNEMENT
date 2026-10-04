# Permissions — agent Évaluateur

Source : `docs/prompt-claude-code.md` §5.2 (recopié tel quel).

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| Chapitre, banque d'exercices, réponses de l'élève | Quiz au statut brouillon, scores de l'élève | Publier un quiz, modifier un score déjà enregistré |

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/evaluateur.env` (modèle : `secrets/evaluateur.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : base de données (rôle `agent_evaluateur`).

Variables : `DATABASE_URL`, `DATABASE_AGENT_KEY`.

Aucune clé de paiement ni de signature électronique. La clé de la base est propre à cet agent et limitée à son rôle.

## Mise en œuvre (ADR 0021, 0024)

- Rôle de base `agent_evaluateur` : lit les chapitres validés de son unité ; écrit des quiz **seulement** pour les chapitres validés de son unité ; la base impose le statut « brouillon », calcule version et empreinte et refuse toute modification d'un quiz existant.
- Scores : une tentative par élève et par quiz, pour l'élève fixé par le serveur (`app.eleve_id`), sur un quiz validé ; aucun droit de modification ni de suppression d'un score.
- Contestations et signalements : seulement pour l'élève du contexte ; source « agent_evaluateur » imposée.
- Statistiques d'erreurs : agrégées et anonymisées (fonction `statistiques_quiz`, réservée aux référents de la famille, rien en dessous de 5 tentatives). L'agent ne lit aucun résultat d'un autre élève.
- Aucune fonction de validation ni de publication n'est accessible au rôle. Les élèves ne lisent jamais la table des quiz (les réponses y figurent) : le serveur leur sert les questions sans réponses.
