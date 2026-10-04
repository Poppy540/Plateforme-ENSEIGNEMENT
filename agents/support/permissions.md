# Permissions — agent Support/inscription

Source : `docs/prompt-claude-code.md` §5.2 (recopié tel quel).

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| FAQ, statut d'inscription | Tickets de support | Paiements, remboursements, suppression de compte, demander un code SMS ou un mot de passe |

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/support.env` (modèle : `secrets/support.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : WhatsApp Business, SMS, base de données (rôle `agent_support`).

Variables : `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `SMS_PROVIDER_API_KEY`, `DATABASE_URL`, `DATABASE_AGENT_KEY`.

Aucune clé de paiement ni de signature électronique. La clé de la base est propre à cet agent et limitée à son rôle.

## Mise en œuvre (à faire)

Ces droits seront appliqués techniquement (rôle de base de données dédié, politiques d'accès au niveau des lignes, outils exposés à l'agent), pas seulement par le prompt.
