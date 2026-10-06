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

## Mise en œuvre (ADR 0028, 0032)

- Rôle de base `agent_support` : lit le statut d'inscription **de la seule personne qui écrit** (fixée par le serveur) ; écrit des tickets de support pour elle (ou sans demandeur pendant l'inscription) et des signalements de détresse ; aucun droit sur les paiements, les comptes, les consentements ni les messages.
- Réponses limitées à la FAQ validée du pack pays (`referentiels/<pays>/faq.yaml`) ; entrées citées contrôlées par le serveur ; sortie imposée (action, catégorie, priorité).
- Codes et numéros de carte masqués avant tout enregistrement ; conversation non conservée.
- Canal : le site (`/aide`) ; WhatsApp Business plus tard.
