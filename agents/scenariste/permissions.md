# Permissions — agent Scénariste

Source : `docs/prompt-claude-code.md` §5.2 (recopié tel quel).

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| Programme validé, ressources de l'unité | Scripts au statut brouillon | Marquer un script comme validé, publier |

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/scenariste.env` (modèle : `secrets/scenariste.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : base de données (rôle `agent_scenariste`).

Variables : `DATABASE_URL`, `DATABASE_AGENT_KEY`.

Aucune clé de paiement ni de signature électronique. La clé de la base est propre à cet agent et limitée à son rôle.

## Mise en œuvre (ADR 0021, 0022)

- Rôle de base `agent_scenariste` : lit le catalogue et les chapitres **validés** de son unité (et leurs prérequis validés) ; écrit des scripts **seulement** pour les chapitres validés de son unité ; la base impose le statut « brouillon », calcule version et empreinte et refuse toute modification d'un script existant.
- L'unité est fixée par le serveur (`app.unite_id`), jamais par le modèle. Aucun accès aux élèves.
- Aucune fonction de validation ni de publication n'est accessible au rôle.
- L'agent est lancé par un enseignant-référent de la famille, depuis son espace, pour un chapitre validé ; 3 brouillons au plus par chapitre et par jour (`SCRIPTS_PAR_CHAPITRE_PAR_JOUR`).
