# 0077 — Répétition générale du déploiement, en local

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 12, étape 3). Rien n'est déployé.

## Contexte

Les briques du déploiement existent séparément : migrations suivies (ADR 0075), paquet (ADR 0076), contrôle de la configuration, vérification du site (ADR 0073), sauvegarde et restauration (ADR 0072). Elles n'avaient jamais été enchaînées comme le jour du premier déploiement, simulation coupée. Une erreur de raccord (variable oubliée, fichier absent du paquet, page de simulation ouverte) ne se verrait qu'en production.

## Décision

1. **`pnpm repetition`** (`scripts/repetition-generale.sh`) enchaîne, sur une base Postgres locale **neuve et jetable** :
   1. migrations simulées (`base:migrer --simuler`), puis appliquées, puis un second passage qui doit dire « Base à jour » ;
   2. import du pack pilote (Gabon) ;
   3. `verifier:production` avec une configuration de production ;
   4. `pnpm paquet`, puis démarrage du serveur **du paquet** (`node server.js`) ;
   5. santé, puis `verifier:site --local` : simulation fermée, accès refusés sans session, en-têtes ;
   6. lecture du journal du serveur : aucune erreur, aucune adresse de base, aucun jeton, aucun secret ;
   7. sauvegarde, puis restauration vérifiée dans une base vide.

   Le rapport final liste chaque étape (✓ ou ✗) et finit par « RÉPÉTITION GÉNÉRALE RÉUSSIE » ou par le nombre d'échecs (code de sortie 1). `REPETITION_DETAILS=1` affiche la fin de la sortie de chaque étape.
2. **Configuration fictive** : `ENVIRONNEMENT=production`, `MODE_AUTH=supabase`, simulation coupée. Les secrets sont tirés au hasard pour cette seule exécution, ne sont jamais écrits ni affichés, et disparaissent avec elle. Les adresses sont en `.invalid` : aucun service extérieur n'est appelé, rien n'est dépensé. La clé du modèle est une valeur fictive, jamais `ANTHROPIC_API_KEY` du poste.
3. **Seule exception attendue** : le contrôle « API de données Supabase » de `verifier:production`, qui ne peut pas joindre Supabase en local. Toute autre ligne « À FAIRE » fait échouer la répétition.
4. **Ce qui ne peut pas être essayé en local** est affiché à part, pour l'étape E3 du guide : https et HSTS, authentification Supabase et fermeture de son API de données, SMS et emails réels, Claude et Cloudflare Stream, sauvegardes de l'hébergeur.
5. **Intégration continue** : la répétition y tourne à chaque poussée, après les tests de base. Un raccord cassé entre migrations, paquet et configuration est vu avant le déploiement.

## Essai

Les 11 étapes réussissent : 39 migrations, puis « Base à jour » ; site conforme avec 1 avertissement attendu (HSTS, absent en http local) ; restauration vérifiée sur 58 tables.

## Conséquences

- Le guide de mise en route (E2) et le dossier de production (§6) demandent `pnpm repetition` avant tout déploiement.
- Une nouvelle variable obligatoire de production doit être ajoutée à la configuration fictive du script. Sinon la répétition échoue, et c'est voulu.
