# 0072 — Sauvegarde et restauration essayées

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 11, étape 3).

## Contexte

Le dossier de production décrivait des sauvegardes (Supabase, plus un `pg_dump` quotidien), mais rien n'avait jamais été restauré. La condition 8 du pilote demande une sauvegarde **et** un essai de restauration. Une restauration ratée découverte le jour d'un incident est le pire cas.

## Décision

1. **`pnpm base:sauvegarder [dossier]`** (`scripts/sauvegarde-base.sh`), connexion `URL_BASE_DONNEES_ADMIN`. Il produit :
   - la copie complète, au format personnalisé de `pg_dump` ;
   - `roles.sql` : les rôles non système et leurs appartenances, recréés **sans connexion ni mot de passe** ;
   - `controle.tsv` : le nombre de lignes de chaque table ;
   - les empreintes SHA-256.

   Les dossiers sont créés en accès réservé (700). Aucune adresse ni aucun secret n'est affiché.
2. **`pnpm base:restaurer <dossier> --confirmer`**, connexion **distincte** `URL_BASE_DONNEES_CIBLE` : la base d'origine ne peut pas être visée par défaut. La commande refuse :
   - toute exécution sans `--confirmer` ;
   - une base cible qui contient déjà des tables : **rien n'est jamais écrasé ni supprimé** ;
   - une sauvegarde dont les empreintes ne correspondent plus.

   Sinon elle recrée les rôles, restaure, puis compare le nombre de lignes de chaque table avec `controle.tsv`. Elle échoue en cas d'écart.
3. **Essai automatique** `pnpm test:sauvegarde`, ajouté à l'intégration continue. Il travaille sur deux Postgres locaux jetables et des données fictives :
   - S01 : refus sans `--confirmer` et vers une base non vide ;
   - S02 : restauration complète dans un serveur vide ;
   - S03 : règles d'accès, droits des agents et rôles restaurés, aucun mot de passe copié ;
   - S04 : refus d'une sauvegarde altérée.
4. **Dossier de production §5** réécrit : les deux niveaux, les commandes, la conservation (chiffrée, 30 jours, accès réservé), l'essai mensuel avec un tableau de suivi. `sauvegardes/` et `*.dump` sont ignorés par git.

## Conséquences

- La condition 8 du pilote a son outil et sa procédure. Il reste à les essayer sur la vraie base, après le déploiement.
- Sur Supabase, la restauration du fournisseur reste la voie normale. La copie de secours sert de recours, et de vérification indépendante.
- Le chiffrement de la copie est laissé à l'outil du propriétaire : disque chiffré ou chiffrement du fichier. Aucune clé n'est gérée par la plateforme.
