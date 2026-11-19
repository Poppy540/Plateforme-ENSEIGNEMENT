# Permissions — agent Production vidéo

Source : `docs/prompt-claude-code.md` §5.2 (recopié tel quel).

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| Scripts validés uniquement (statut, version, empreinte vérifiés) | Vidéos au statut à relire | Produire depuis un script non validé ou modifié, modifier le texte, publier, cloner une voix sans autorisation |

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/production-video.env` (modèle : `secrets/production-video.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : avatar, voix, hébergement vidéo, base de données (rôle `agent_production_video`).

Variables : `AVATAR_API_KEY`, `TTS_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`, `DATABASE_URL`, `DATABASE_AGENT_KEY`.

Aucune clé de paiement ni de signature électronique. La clé de la base est propre à cet agent et limitée à son rôle.

## Mise en œuvre (ADR 0020, 0021, 0025)

- Chaîne programmée (pas un agent conversationnel) : `application/src/lib/production-video/`.
- Rôle de base `agent_production_video` : lit seulement les scripts **validés** et leur état complet (`script_pour_production` : empreinte recalculée, dernière validation tracée) ; dépose des vidéos que la base force au statut « à relire » après avoir revérifié statut, version et empreinte ; écrit le journal des productions et des alertes sans élève. Aucune fonction de validation ni de publication.
- Voix et visage : la fiche de l'avatar est dans le pack pays ; une personne réelle exige deux autorisations (voix, visage) enregistrées par l'administration et actives (`autorisation_active`) ; le registre n'est lisible par aucun agent.
- Budget par vidéo bloquant (`BUDGET_VIDEO_USD`), 3 tentatives au plus par segment, arrêt et alerte au-delà.
- Batterie VP : tests automatiques déterministes (`chaine.test.ts`).
