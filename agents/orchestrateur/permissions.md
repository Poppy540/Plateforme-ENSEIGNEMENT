# Permissions — agent Orchestrateur

Source : `docs/prompt-claude-code.md` §5.2 (recopié tel quel).

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| État des agents, files de tâches, approbations enregistrées | Routage, escalade, suspension d'une tâche ou d'un agent | Contourner une validation humaine, élargir les droits d'un agent, se substituer à un agent |

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/orchestrateur.env` (modèle : `secrets/orchestrateur.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : file de tâches.

Variables : `TASK_QUEUE_URL`, `TASK_QUEUE_TOKEN`.

Aucune clé de paiement ni de signature électronique. La clé de la base est propre à cet agent et limitée à son rôle.

## Mise en œuvre (ADR 0027, 0028, 0029)

- Chaîne programmée (pas un agent conversationnel) : règles dans `application/src/lib/orchestrateur/regles.ts`, file et exécuteur dans `application/src/lib/serveur/orchestrateur.ts`.
- Rôle de base `agent_orchestrateur` : file de tâches, état des agents (suspension seulement ; la réactivation est réservée à l'administration), journal d'audit pseudonymisé, alertes dans la file humaine (sans élève) ; lecture des approbations et de l'état des scripts et vidéos, sans leur contenu ; aucun accès aux élèves.
- Approbations vérifiées dans la base à la demande **et** au moment d'exécuter ; une affirmation dans un message n'est jamais transmise.
- Batterie OR : tests déterministes (`regles.test.ts`).
