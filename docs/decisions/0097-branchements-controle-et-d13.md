# 0097 — Branchements du contrôle local et décision D13

- **Date** : 2026-10-30 · **Statut** : accepté (Jalon 17, étape 3 ; D13 choisie par le propriétaire)

## Contexte

`pnpm controler` (ADR 0095) et son rapport (ADR 0096) existent. Reste à les brancher là où ils servent : l'intégration continue, chaque envoi et chaque déploiement.

## Décision

- **Intégration continue** : le flux `.github/workflows/application.yml` installe age et Chromium, puis lance `pnpm controler` au lieu de la liste des neuf commandes. Les sorties et le rapport sont gardés 14 jours comme artefact. Un test unitaire vérifie que le flux appelle la commande et ne relance pas les contrôles un par un. Le jour où GitHub Actions est débloqué, il contrôle exactement ce qui est contrôlé en local.
- **Crochet avant envoi, facultatif** :
  - `pnpm controler:installer` pose un crochet git local `pre-push`, qui lance `pnpm controler --rapide` (environ 25 s) ;
  - `--retirer` l'enlève ;
  - un crochet `pre-push` qui ne vient pas de cette commande n'est jamais remplacé ni effacé ;
  - pour passer outre une fois : `git push --no-verify`.
- **D13, choix a** : la preuve attendue de la **condition 6** du pilote (hébergement déployé) comprend désormais le `CONTROLE.md` du paquet déployé, qui doit dire « contrôle complet réussi ». Pour un hébergement sans serveur, c'est le `rapport.md` du contrôle complet du commit construit. Rien n'est bloqué techniquement : une correction urgente reste possible, mais elle se voit au moment de cocher la condition.
- **Documentation** : guide de mise en route (E2), dossier de production (§3 et mise à jour), `docs/attentes-proprietaire.md`, `application/README.md`, `CLAUDE.md`.

## Conséquences

- Choix écartés pour D13 :
  - b, paquet refusé sans contrôle : trop lourd pour un correctif urgent, et sans effet sur un hébergeur qui construit depuis le dépôt ;
  - c, simple recommandation : rien ne garantit qu'elle est suivie.
- Le crochet reste un choix de chaque poste : il n'est pas versionné et n'est pas posé d'office.
