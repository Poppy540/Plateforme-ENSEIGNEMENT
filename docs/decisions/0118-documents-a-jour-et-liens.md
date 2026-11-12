# 0118 — Documents à jour, archives datées, liens internes contrôlés

- **Date** : 2026-11-12 · **Statut** : appliqué (Jalon 23, étape 3)

## Contexte

Après 22 jalons, certains documents disaient faux :

- le `README.md` du dépôt annonçait « squelette, aucun code applicatif » ;
- le README des agents, « aucune skill installée » (il y en a 29) ;
- le README de l'application donnait un ancien chemin du navigateur de test ;
- le sommaire du dossier du pilote ignorait quatre documents récents.

Deux documents datés (comparatif des fournisseurs, recherche de skills) ne disaient pas qu'ils n'étaient plus tenus à jour. Aucun contrôle ne vérifiait les liens entre documents.

## Décision

1. **`README.md` du dépôt réécrit en porte d'entrée** : état du projet en une phrase ; que lire selon qu'on est propriétaire, référent, juriste, équipe de déploiement, personne qui ajoute un pays ou développeur ; carte des dossiers.
2. **Documents corrigés** : README des agents, de l'application (renvoi à la liste complète des commandes dans `CLAUDE.md`), sommaire du pilote, carte du dépôt dans `CLAUDE.md`.
3. **Archives datées** : le comparatif des fournisseurs (octobre 2026) et la recherche de skills (2026-10-04) portent en tête « Archive datée », avec ce qui les remplace ou ce qu'il faut revérifier. Les plans, bilans et captures des jalons sont des archives par nature : ils ne sont pas réécrits.
4. **`pnpm verifier:liens`**, dans le contrôle rapide. Il vérifie que chaque lien relatif de chaque fichier Markdown suivi par git mène à un fichier ou un dossier existant. Une ancre doit mener à un titre qui existe, calculé comme GitHub. Les adresses web ne sont pas suivies (contrôle hors ligne). Premier passage : 306 fichiers, 370 liens internes, aucun cassé.

## Conséquences

- Un lien cassé fait échouer `pnpm controler --rapide`, donc le crochet avant envoi s'il est posé.
- Sur GitHub, le contrôle ne se lance que pour un envoi qui touche `application/` : un envoi de documents seuls n'est contrôlé que localement. Ce choix est voulu : il évite un contrôle complet de 7 minutes pour un texte.
