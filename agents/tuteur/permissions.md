# Permissions — agent Tuteur

Source : `docs/prompt-claude-code.md` §5.2 (recopié tel quel).

| Peut lire | Peut écrire | Ne peut pas |
|---|---|---|
| Progression, graphe de prérequis | Recommandations de révision, rapports parents si consentement enregistré | Contacter les parents sans consentement enregistré, diagnostiquer, comparer des élèves |

## Règles communes

Les règles communes du §5.1 (`CLAUDE.md`, section « Droits et interdictions ») s'appliquent en plus de ce tableau.

## Clés

Fichier : `secrets/tuteur.env` (modèle : `secrets/tuteur.env.example`). Rempli par le propriétaire, jamais lu par Claude Code.

Accès : base de données (rôle `agent_tuteur`).

Variables : `DATABASE_URL`, `DATABASE_AGENT_KEY`.

Aucune clé de paiement ni de signature électronique. La clé de la base est propre à cet agent et limitée à son rôle.

## Mise en œuvre (ADR 0028, 0030)

- Rôle de base `agent_tuteur` : lit le catalogue validé, le graphe de prérequis validé, la progression, les scores (sans le contenu des quiz), les préférences et l'inactivité **de l'élève fixé par le serveur** ; écrit des recommandations (≤ 3 priorités, non modifiables), des signalements et, avec consentement actif seulement, des rapports aux parents ; ne lit jamais le contact du parent.
- Les chapitres candidats sont calculés sans modèle (remontée du graphe de prérequis) ; le Tuteur ne peut choisir que parmi eux.
- Rapports aux parents (ADR 0031) : accord séparé vérifié par la base ; envoi par le service de messagerie, seul à obtenir le contact du parent ; lien propre à chaque rapport.
- Détection planifiée du décrochage (`eleves_inactifs`) : identifiants seulement, sans doublon de signalement.
