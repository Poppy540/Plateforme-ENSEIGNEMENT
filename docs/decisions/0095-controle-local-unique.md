# 0095 — Contrôle local unique : `pnpm controler`

- **Date** : 2026-10-30 · **Statut** : accepté (Jalon 17, étape 1)

## Contexte

GitHub Actions ne démarre plus (bilan du Jalon 12, §5). Les contrôles du projet existent, mais en neuf commandes séparées, avec des outils à installer (PostgreSQL, age, Chromium) et un navigateur à indiquer. Le plan du Jalon 17 (ADR 0094) les réunit en une seule commande.

## Décision

- **Une commande**, `pnpm controler`, dans `application/`. La liste des contrôles, les outils dont chacun a besoin et le résumé sont dans `src/lib/exploitation/controle.ts` (fonctions pures, testées). Le script `scripts/controler.mts` détecte les outils et enchaîne les scripts existants ; il n'en remplace aucun.
- **Deux niveaux** :
  - `--rapide` : format, lint, types, tests unitaires. Il ne demande ni PostgreSQL, ni age, ni navigateur. À lancer avant chaque envoi.
  - complet, par défaut : les mêmes, puis base, migrations suivies, sauvegarde, répétition générale et bout en bout. À lancer avant chaque déploiement.
- **Outils vérifiés d'abord** : Node 20 ou plus, dépendances installées, PostgreSQL (`PG_BIN` ou `/usr/lib/postgresql/*/bin`), age, Chromium (`CHEMIN_CHROMIUM`, sinon le navigateur de Playwright, sinon le dossier partagé des navigateurs). Pour chaque outil manquant, la commande dit comment l'installer. Le chemin de Chromium trouvé est transmis aux tests de bout en bout : plus besoin de l'indiquer.
- **Un contrôle qui ne peut pas tourner** (outil manquant, port 3100 ou 3300 déjà occupé) est marqué « non lancé ». Le contrôle d'ensemble est alors en échec : un contrôle complet n'est réussi que si tout a été lancé et a réussi.
- **Après un échec, la commande continue** pour tout montrer. À l'écran, elle affiche les 20 dernières lignes du contrôle en échec. La sortie complète de chaque contrôle est gardée dans `application/.controles/<horodatage>/`, ignoré par git. Le code de sortie est 0 si tout est réussi, 1 sinon.
- **Base locale de développement** : les tests de bout en bout la réinitialisent (comportement existant). Si elle ne tournait pas avant, la commande l'arrête à la fin.
- **`--liste`** montre les outils et les contrôles prêts, sans rien lancer.
- **Aucune variable d'environnement** n'est affichée. Aucune dépendance n'est ajoutée.

## Conséquences

- Un seul endroit à tenir pour la liste des contrôles. Un test vérifie que le niveau complet reprend tout ce que lance l'intégration continue ; à l'étape 3, l'intégration continue appellera la commande elle-même.
- Le rapport daté (étape 2) s'appuiera sur les mêmes résultats.
