# 0114 — Un déploiement, un pays : paquet par pays, fuseau de la base

- **Date** : 2026-11-10 · **Statut** : appliqué (Jalon 22, étape 4)

## Contexte

L'inventaire du Jalon 22 (écart A) a relevé que **le « jour » suivait l'horloge de la base** (UTC) et non celle du pays. C'est le cas des quotas et limites « par jour », des mesures, et de la semaine et des dates du pilote. Le `fuseau_horaire` du pack était importé sans servir. Quatre pages calculaient aussi « aujourd'hui » en UTC côté serveur, indépendamment de la base. Pour le Gabon (UTC+1), la journée changeait à 1 h du matin ; pour un pays à UTC+8 ou UTC−5, elle changerait en pleine journée. Le paquet de déploiement embarquait tous les packs réels du dépôt (écart B).

## Décision

1. **Un déploiement sert un pays.** Pas de fuseau par pays dans une même base : le pilote (chapitres, période, conditions, clôture) est déjà unique par base.
2. **`pnpm base:fuseau [--simuler]`**, après l'import du pack : la base prend le fuseau du pack (`alter database … set timezone`). La commande refuse une base sans pays réel, avec des pays de fuseaux différents, ou dont le fuseau est inconnu de Postgres. Un second passage ne change rien.
3. **La base est la seule horloge du jour.** Les quatre pages du pilote (tableau de bord, semaine, fin, clôture) lisent la date du jour dans la base (`aujourdhui()` de `src/lib/serveur/base.ts`), comme les fonctions SQL.
4. **`pnpm verifier:production`** lit la base avec la connexion de l'application, au nom d'un visiteur. Elle contrôle trois points : un pays réel importé, aucun pack de test, fuseau de la base égal à celui du pays.
5. **`pnpm paquet --pays <pack>`** : seuls les packs choisis sont embarqués (refus d'un pack de test ou introuvable) et notés dans `VERSION` (`pays …`). Sans `--pays`, tous les packs réels, comme avant.
6. **La répétition générale** vérifie tout cela : fuseau réglé puis inchangé au second passage, configuration complète (avec les points de la base), paquet du seul pays du pilote, pack de test refusé.

## Conséquences

- Mise en service : migrations → import du pack → `pnpm base:fuseau` → redémarrage → `pnpm verifier:production` (dossier de production §2, `paquet/LISEZ-MOI.md`, guide de mise en route E2).
- La base locale de développement reste en UTC (les deux packs, Gabon et pays Z, y sont importés) : `verifier:production` le signale, comme attendu.
- Les heures des pages d'administration (journal) restent affichées en UTC : les dates sont justes, les heures se lisent en UTC. À revoir si le propriétaire le demande.
