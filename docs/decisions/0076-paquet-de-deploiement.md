# 0076 — Paquet de déploiement

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 12, étape 2). Rien n'est déployé.

## Contexte

Le premier déploiement n'avait pas de forme définie. Le serveur lit à l'exécution des fichiers du dépôt hors de `application/` : les prompts et skills des agents, les packs pays et les règles communes (§5.1). Il fallait un paquet qui contienne exactement ce qui sert en production : ni secret, ni fichier de test, ni pack fictif.

## Décision

1. **Construction autonome à la demande** : `output: "standalone"` seulement quand `SORTIE_AUTONOME=1` (`next.config.ts`). Le développement, les tests et `pnpm start` ne changent pas.
2. **`pnpm paquet [dossier]`** (`scripts/paquet.sh`, sortie par défaut `../paquet`, ignorée par git) assemble :
   - `application/` : le serveur autonome (`node server.js`), ses fichiers statiques et `public/` sans les vidéos simulées ; les sources et fichiers de test ramassés par le traçage sont retirés ;
   - `agents/` : seulement `prompt.md` et `skills/` de chaque agent, sans les tests ;
   - `referentiels/` : les packs pays, **sauf le modèle et les packs de test** (`statut_pack: test`, `zz-*`) ;
   - `docs/prompt-claude-code.md` ;
   - les exemples de `deploiement/`, `LISEZ-MOI.md` et `VERSION` (commit, date, mention des modifications non commitées).

   Le serveur trouve ces fichiers seul : `CHEMIN_DEPOT` vaut par défaut le dossier parent de `application/`.
3. **Contrôles avant de livrer le paquet** : aucun fichier `.env*`, `*.dump`, de test, de sauvegarde ni du pack fictif. Sinon, le paquet est effacé et la commande échoue. Un ancien dossier n'est remplacé que s'il porte un `VERSION` : un dossier qui n'est pas un paquet n'est jamais effacé.
4. **Exemples de déploiement**, sans aucune valeur :
   - service systemd `plateforme@.service` : une instance par port, deux instances par serveur (ADR 0064), redémarrage automatique, durcissement ;
   - variables dans `/etc/plateforme/commun.env` (droits 600) ;
   - répartiteur Caddy : https, HSTS, compression, santé.
5. **Commandes d'exploitation** (`base:migrer`, `base:sauvegarder`, `verifier:production`, purge) : elles se lancent depuis une copie du dépôt, avec les mêmes variables que le serveur. Le paquet reste minimal.

## Essai

Le paquet est construit (69 Mo), puis lancé avec `node server.js` sur la base locale de données fictives :
- la santé répond 200 ;
- les fichiers statiques sont servis ;
- la page d'aide affiche la FAQ lue dans le pack du paquet.

L'essai complet, simulation coupée, est l'étape 3 (répétition générale).

## Conséquences

- Le dossier de production (§3.0) et le guide de mise en route (E2) décrivent les deux voies : serveur Linux avec le paquet, ou hébergement sans serveur construit depuis le dépôt.
