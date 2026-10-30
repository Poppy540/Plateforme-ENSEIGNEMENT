# Paquet de déploiement

Produit par `cd application && pnpm paquet` (ADR 0076). **Aucun secret** dedans : les variables sont posées sur le serveur (modèle `secrets/commun.env.example`). Données fictives absentes : le pack de test `zz-fictif` n'y est pas.

## Contenu

| Dossier                      | Rôle                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| `application/`               | Serveur Next.js autonome : `node server.js`, avec ses dépendances.                          |
| `agents/`                    | Prompts et skills des agents, lus par le serveur.                                           |
| `referentiels/`              | Packs pays (pilote : `gabon/`).                                                             |
| `docs/prompt-claude-code.md` | Règles communes des agents (§5.1), lues par le serveur.                                     |
| `deploiement/`               | Exemples : service systemd (`plateforme@.service`), répartiteur Caddy.                      |
| `VERSION`                    | Version (commit), date de construction et contrôle local du commit.                         |
| `CONTROLE.md`                | Rapport du dernier contrôle complet réussi pour ce commit (`pnpm controler`), ou « aucun ». |

Les commandes d'exploitation (`base:migrer`, `base:sauvegarder`, `verifier:production`, `donnees:purger`…) se lancent depuis une copie du dépôt (`cd application && pnpm install`), avec les mêmes variables que le serveur. Les sauvegardes sont chiffrées avec `age` : l'outil doit être installé et `SAUVEGARDE_DESTINATAIRE_AGE` (clé publique) renseignée ; la clé privée reste hors du serveur (dossier de production §5).

## Serveur Linux (exemple)

1. Copier le paquet dans `/opt/plateforme` (utilisateur dédié `plateforme`, Node.js 22 ou plus).
2. Poser les variables dans `/etc/plateforme/commun.env` (droits 600, propriétaire `plateforme`).
3. `pnpm base:migrer` (depuis le dépôt), puis l'import du pack, puis `pnpm verifier:production`.
4. `sudo cp deploiement/plateforme@.service /etc/systemd/system/ && sudo systemctl enable --now plateforme@3001 plateforme@3002`.
5. Répartiteur https (exemple `deploiement/Caddyfile.exemple`), puis `pnpm verifier:site https://<adresse>` depuis un autre poste.

## Hébergement sans serveur (Vercel, Cloudflare…)

Le paquet n'est pas nécessaire : l'hébergeur construit l'application depuis le dépôt (dossier `application/`). Les fichiers `agents/`, `referentiels/` et `docs/prompt-claude-code.md` doivent être disponibles au serveur : construire depuis la racine du dépôt et poser `CHEMIN_DEPOT` vers celle-ci. Le nombre d'instances est géré par l'hébergeur.
