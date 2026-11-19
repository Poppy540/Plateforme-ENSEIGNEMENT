# 0075 — Migrations suivies

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 12, étape 1).

## Contexte

Les migrations s'appliquaient fichier par fichier, avec `psql` et à la main, « dans l'ordre des noms ». Plusieurs risques :
- oublier une migration ;
- en rejouer une, et provoquer des erreurs ;
- en appliquer une modifiée après coup : la base ne correspond plus au dépôt ;
- laisser une base à moitié migrée après une erreur.

Rien ne disait non plus quelle version de la structure tournait en production.

## Décision

1. **`pnpm base:migrer`** (`scripts/migrer.mts`, connexion `URL_BASE_DONNEES_ADMIN`, jamais affichée). La commande :
   - applique les migrations qui manquent, dans l'ordre des noms, **chacune dans sa transaction** : une migration en échec est annulée entièrement et n'est pas notée ;
   - note chaque migration appliquée dans `public.migrations_appliquees` (nom, empreinte SHA-256 aux fins de ligne normalisées, date). Cette table est illisible pour les rôles de l'application ;
   - prend un verrou pour qu'un seul passage tourne à la fois ;
   - refuse :
     - une migration appliquée puis modifiée ;
     - une migration appliquée mais absente des fichiers ;
     - une nouvelle migration plus ancienne que la dernière appliquée ;
     - un nom de fichier mal formé.
2. **`--simuler`** liste ce qui serait appliqué, sans rien écrire.
3. **Base migrée à la main avant l'outil** : la commande refuse, puis accepte `--marquer-jusqu-a <nom>` après vérification par le propriétaire. Les migrations jusqu'à ce nom sont alors notées comme appliquées sans être rejouées.
4. La logique de décision est une fonction pure, testée (`src/lib/exploitation/migrations.ts`). **Essai** `pnpm test:migrations`, ajouté à l'intégration continue :
   - M01 : base neuve, simulation sans effet, second passage sans effet ;
   - M02 : base en retard ;
   - M03 : fichier modifié ;
   - M04 : migration en échec ;
   - M05 : base migrée à la main ;
   - M06 : table de suivi illisible pour l'application.
5. **Même outil partout** : `pnpm test:base`, la base locale et l'essai de sauvegarde passent désormais par `base:migrer`. Toute la batterie de base valide donc l'outil.

## Conséquences

- Le dossier de production (§2.5 et §6) décrit les commandes.
- La copie de secours (ADR 0072) inclut la table de suivi : une base restaurée connaît ses migrations.
