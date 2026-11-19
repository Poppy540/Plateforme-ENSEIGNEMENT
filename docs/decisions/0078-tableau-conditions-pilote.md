# 0078 — Tableau des 12 conditions du pilote

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 12, étape 4).

## Contexte

Les 12 conditions préalables au pilote sont décrites dans `docs/pilote/README.md`. Le propriétaire les cochait sur papier. Certaines sont pourtant vérifiables par la plateforme : référent actif, chapitres prêts, classe créée, configuration du serveur. La décision de démarrer (G2 du guide de mise en route) doit reposer sur un décompte objectif et tracé.

## Décision

1. **Page `/administration/conditions`** : les 12 conditions, chacune avec son état (« Remplie », « À faire », « À revoir »), la preuve attendue et ce que la plateforme a vérifié. En tête, le décompte « N / 12 conditions remplies ». La décision de démarrer n'est proposée qu'à 12 / 12. L'état est toujours écrit en toutes lettres ; la couleur n'est qu'un repère en plus.
2. **Trois natures** (`src/lib/pilote/conditions.ts`, fonctions pures) :
   - **automatique** : conditions 3 (référent actif pour chaque matière des chapitres du pilote) et 4 (3 chapitres du pilote au moins, chacun avec chapitre, script et quiz validés ; les vidéos publiées sont comptées sans être exigées, car le pilote peut s'appuyer sur les leçons écrites). Elles ne se cochent jamais à la main ; la base le refuse.
   - **mixte** : une vérification ET une coche avec preuve.
     - Condition 2 : une classe du pilote existe.
     - Conditions 5, 6, 7 et 8 : variables du serveur contrôlées par `verifierConfiguration` (ADR 0045).
     - Condition 11 : plafond journalier `COUT_JOUR_MAX_AGENT_USD` fixé explicitement.

     Une condition cochée dont la vérification échoue passe « À revoir ».
   - **manuelle** : conditions 1, 9, 10 et 12, cochées avec une preuve seulement.
3. **Aucune valeur affichée** : seuls les noms des variables à régler apparaissent, jamais leur contenu.
4. **Coche du propriétaire** : une preuve de 3 à 300 caractères et sa date, qui ne peut pas être dans le futur. Les emails et numéros de téléphone sont masqués avant l'enregistrement (`masquerCoordonnees`) ; les liens restent, car une preuve peut citer l'adresse du site. Le retrait d'une coche demande un motif. Coches et retraits sont écrits dans le journal d'audit (numéro, date, motif ; pas la preuve).
5. **Base** (migration 0040) : table `conditions_pilote`, illisible hors des fonctions d'administration. Les faits sont calculés par `faits_conditions_pilote()`, qui ne renvoie que des nombres : chapitres du pilote, chapitres prêts, chapitres avec vidéo, familles sans référent, classes. Les fonctions `cocher_condition_pilote` et `decocher_condition_pilote` sont réservées à l'administration.
6. **Rien de propre à un pays** : les textes des conditions ne nomment ni pays, ni classe, ni matière. Les matières du pilote viennent des chapitres désignés dans l'administration (ADR 0070).

## Tests

- Base : CO01 (faits, en nombres, administration seulement ; famille sans référent) et CO02 (coche contrôlée et tracée ; 3 et 4 refusées).
- Unitaires : natures, « À revoir », seuils de la condition 4, décompte, masquage des coordonnées.
- Bout en bout : page, preuve masquée, date future refusée, condition mixte « À revoir » en développement, retrait, accessibilité.

## Conséquences

- `docs/pilote/README.md` et le guide de mise en route (G2) renvoient à ce tableau, qui fait foi pour l'état des conditions.
- Une vérification automatique peut faire repasser une condition « À revoir » après coup, par exemple si un référent perd son accès ou si une variable disparaît. C'est voulu.
