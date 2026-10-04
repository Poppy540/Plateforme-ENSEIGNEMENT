# Dossier des clés

## Principe

- Ce dossier ne contient dans git que des **modèles** (`*.env.example`) : noms de variables et valeurs factices.
- Les vraies valeurs vont dans `secrets/<agent>.env` et `secrets/commun.env`. Ces fichiers sont ignorés par git (`.gitignore`) et leur lecture est interdite à Claude Code (`.claude/settings.json`).
- **Seul le propriétaire du projet** remplit les vrais fichiers. Claude Code ne lit, n'affiche, ne copie ni ne commite jamais une valeur, et ne demande jamais de coller une clé dans une conversation.
- La clé API Claude n'est **pas** dans ce dossier : elle vient de la variable d'environnement `ANTHROPIC_API_KEY`, définie hors du dépôt. Le code la lit depuis l'environnement et ne la journalise jamais.

## Mode d'emploi

1. Copier le modèle : `cp secrets/professeur.env.example secrets/professeur.env`
2. Remplacer chaque `remplacer-moi` par la vraie valeur, dans votre éditeur.
3. Vérifier que `git status` n'affiche pas le fichier `.env` (il doit être ignoré).

## Règles

- **Moindre privilège** : chaque agent a son fichier et uniquement les clés dont il a besoin. La clé de base de données de chaque agent correspond à un rôle restreint qui lui est propre (voir `agents/<agent>/permissions.md`).
- **Aucune clé de paiement ni de signature électronique** pour un agent IA. Les paiements restent dans un service backend classique, les signatures chez des humains.
- **Développement et production séparés** : clés distinctes. En production, les secrets vivent dans un gestionnaire de secrets (à choisir avec la stack), pas dans des fichiers.
- **Rotation** : changer une clé dès qu'elle a pu être exposée, et périodiquement (fréquence à fixer). Révoquer l'ancienne clé chez le fournisseur.

## Modèles

| Fichier | Contenu |
|---|---|
| `commun.env.example` | Variables communes (environnement, pays par défaut, conservation) |
| `professeur.env.example`, `scenariste.env.example`, `evaluateur.env.example`, `tuteur.env.example`, `conformite.env.example`, `coordinateur.env.example` | URL de la base + clé à rôle restreint |
| `production-video.env.example` | Avatar, voix, Cloudflare Stream, base |
| `support.env.example` | WhatsApp Business, SMS, base (tickets) |
| `orchestrateur.env.example` | File de tâches |
| `recruteur.env.example` | Recherche web, messagerie, calendrier, base |

Les noms de variables sont indicatifs et seront ajustés quand les fournisseurs seront choisis.
