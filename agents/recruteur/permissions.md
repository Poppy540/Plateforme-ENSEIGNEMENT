# Permissions — agent Recruteur

Source : `docs/prompt-claude-code.md` §5.2 (recopié tel quel).

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| Sources autorisées, fiches candidats, FAQ de recrutement, conditions validées, liste d'opposition | Fiches candidats minimales, brouillons de messages et d'accords, statuts du pipeline, liste d'opposition | Envoyer un premier message sans approbation, signer ou promettre, fixer une rémunération, contacter après un refus, collecter hors sources autorisées, créer un compte sans approbation |

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/recruteur.env` (modèle : `secrets/recruteur.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : recherche web, messagerie professionnelle, calendrier, base de données (rôle `agent_recruteur`).

Variables : `WEB_SEARCH_API_KEY`, `MAIL_API_KEY`, `CALENDAR_API_TOKEN`, `DATABASE_URL`, `DATABASE_AGENT_KEY`.

Aucune clé de paiement ni de signature électronique. La clé de la base est propre à cet agent et limitée à son rôle.

## Envoi (ADR 0010)

Le Recruteur envoie les messages et les invitations d'agenda **uniquement après validation du propriétaire**, enregistrée dans le système. L'outil d'envoi vérifie l'approbation (valideur, date, empreinte du texte), la liste d'opposition et la limite d'une relance ; sans approbation, l'envoi est refusé.

## Mise en œuvre (ADR 0040)

- Rôle de base de données `agent_recruteur` (migration 0023), limité au candidat fixé par le serveur : fiche sans le contact, brouillons de messages et de dossiers d'accord, statuts (jamais « signé »), liste d'opposition en écriture seule, signalements sans élève. Aucune approbation, aucun envoi, aucune donnée d'élève.
- Approbation par le propriétaire avec l'empreinte du texte ; texte figé ; envoi par le service de messagerie seulement, après contrôle de l'approbation, de l'opposition, du premier contact unique et de la relance unique après délai (tests de base N01-N07).
- Contrôles du serveur sur chaque sortie de l'agent (`application/src/lib/agents/recruteur/tache.ts`).
- Outils non encore branchés : recherche web, calendrier, envoi réel d'emails (fournisseurs à choisir, avis du juriste).
