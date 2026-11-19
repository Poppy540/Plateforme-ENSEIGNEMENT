# 0096 — Rapport daté du contrôle local, noté dans le paquet

- **Date** : 2026-10-30 · **Statut** : accepté (Jalon 17, étape 2)

## Contexte

`pnpm controler` (ADR 0095) dit à l'écran si tout passe, mais rien n'en reste. Avant un déploiement, il faut pouvoir dire : ce commit a passé le contrôle complet, à telle date. Sans GitHub Actions, rien d'autre ne le dit.

## Décision

- **Un rapport Markdown par passage**, `application/.controles/<horodatage>/rapport.md`, gardé sur la machine (ignoré par git). Il contient :
  - la date ;
  - le niveau ;
  - le commit et la branche ;
  - l'état de la copie de travail ;
  - le résultat et la durée de chaque contrôle ;
  - pour un contrôle en échec ou non lancé, les lignes utiles.

  Sa première ligne est un commentaire lisible par la machine : niveau, résultat, commit, copie propre. Les fonctions sont `rapportMarkdown`, `lireEntete` et `controleDuCommit`, dans `src/lib/exploitation/controle.ts`.

- **Valeur pour un commit** : un contrôle ne vaut pour un commit que si la copie de travail était propre au début du passage. Une copie propre n'a ni modification ni fichier nouveau, hors fichiers ignorés par git. Sinon, le rapport le dit et le paquet ne le retient pas.
- **Aucune valeur sensible** : les valeurs des variables dont le nom désigne une clé, un secret, un jeton, un sel, un mot de passe, une identité, un destinataire ou une adresse de base sont remplacées par « [masqué] ». Le remplacement s'applique dans les sorties gardées, à l'écran et dans le rapport. Un test le vérifie.
- **Paquet de déploiement** : `pnpm paquet` cherche, dans `.controles/`, le dernier contrôle complet réussi, sur copie propre, pour le commit du paquet (`scripts/controle-du-commit.mts`).
  - S'il en trouve un, il copie le rapport dans `CONTROLE.md` et ajoute à `VERSION` sa date et l'empreinte du rapport.
  - Sinon, `CONTROLE.md` et `VERSION` disent « aucun contrôle complet ».
  - Le paquet n'est jamais refusé pour cela : il informe. L'exiger avant un déploiement est une décision du propriétaire (étape 3).

## Conséquences

- Les rapports restent sur la machine qui a contrôlé. Le paquet construit sur une autre machine dira « aucun ». C'est voulu : on ne peut pas affirmer un contrôle qu'on n'a pas vu.
- La répétition générale construit un paquet pendant le contrôle lui-même : ce paquet-là dit « aucun », ce qui est exact à ce moment.
