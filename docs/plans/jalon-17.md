# Plan du Jalon 17 — contrôle local unique

**Statut** : validé par le propriétaire le 2026-10-30 (piste choisie, ADR 0094). Étape 1 faite (`pnpm controler`, ADR 0095).

**Objectif** : depuis le 19 octobre, GitHub Actions ne démarre plus (aucune machine attribuée). Plus rien ne vérifie automatiquement chaque envoi. Aujourd'hui, les contrôles existent, mais en neuf commandes séparées, avec une base locale à démarrer et un navigateur à indiquer :

- format, lint et types ;
- tests unitaires ;
- base ;
- migrations ;
- sauvegarde ;
- bout en bout ;
- répétition générale.

Le Jalon 17 les réunit en **une seule commande**, `pnpm controler`, utilisable avant chaque envoi et avant chaque déploiement. Le jour où GitHub Actions est débloqué, la même commande y tourne : un seul endroit à tenir. **Rien n'est déployé ni souscrit.**

**Principes inchangés** :

- données fictives seulement ;
- aucun secret lu ni affiché, ni dans le terminal ni dans le rapport ;
- aucun prompt d'agent modifié ;
- aucune dépendance nouvelle sans accord.

## Étapes (dans cet ordre)

| #   | Étape                        | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Besoin du propriétaire           |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 0   | Plan                         | Ce plan, l'ADR 0094 et `memory.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Validation (faite)               |
| 1   | La commande `pnpm controler` | **Avant de lancer quoi que ce soit**, elle vérifie les outils nécessaires (Node, pnpm, Postgres local, `age`, Chromium) et dit en français ce qui manque et comment l'installer. **Deux niveaux** : `--rapide` (format, lint, types, unitaires : quelques minutes, pour chaque envoi) et complet par défaut (tout, y compris base, migrations, sauvegarde, bout en bout et répétition : pour chaque déploiement). Elle démarre elle-même les bases locales jetables et les arrête à la fin. Elle continue après un échec pour tout montrer, puis finit sur un résumé et un code de sortie non nul. | —                                |
| 2   | Rapport daté                 | Chaque passage écrit un **rapport Markdown** : date, commit, branche, niveau, durée et résultat de chaque contrôle, dernières lignes utiles en cas d'échec. Aucune valeur de variable d'environnement n'y figure ; un test le vérifie. Les rapports restent sur la machine (dossier ignoré par git). `pnpm paquet` note dans le paquet l'empreinte du dernier rapport complet réussi pour ce commit, ou « aucun contrôle complet » ; il ne refuse rien, il informe.                                                                                                                                | —                                |
| 3   | Branchements                 | **Intégration continue** : le flux GitHub Actions appelle `pnpm controler` au lieu de la liste actuelle (même résultat le jour du déblocage). **Crochet avant envoi**, facultatif : `pnpm controler:installer` installe un crochet git local qui lance le niveau rapide avant chaque `git push` ; il se retire par la même commande. **Documentation** : guide de mise en route, `application/README.md`, `CLAUDE.md`, dossier de production. Faut-il exiger un contrôle complet réussi avant le déploiement (condition 6 ou 12 du pilote) ? Choix présenté avec une recommandation.               | Choix sur la condition du pilote |
| 4   | Passages réels des agents    | Repris des Jalons 11 à 16 : dès que la clé, la relecture des skills et l'accord sont là, mini-essais, puis séries complètes (~121 USD) après un nouvel accord.                                                                                                                                                                                                                                                                                                                                                                                                                                     | Clé API ; accord sur chaque coût |
| 5   | Bilan                        | Bilan comme aux jalons précédents ; un rapport de contrôle complet en exemple. Pas de captures d'écran : aucun écran ne change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | —                                |

L'étape 4 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-10-30)

1. **Piste retenue** : contrôle local unique.
2. **Écartés pour ce jalon** :
   - la preuve d'exportabilité avec un pack pays fictif ;
   - la skill « faible débit » ;
   - une nouvelle matière de 3e.

## Hors Jalon 17

- Le déblocage de GitHub Actions (réglages du dépôt et facturation : par le propriétaire).
- Tout service d'intégration continue payant ou tiers.
- Le déploiement et toute souscription.
