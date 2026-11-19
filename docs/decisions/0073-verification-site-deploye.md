# 0073 — Vérification d'un site déployé

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 11, étape 4).

## Contexte

`pnpm verifier:production` contrôle la **configuration** sur le serveur, sans afficher de valeur. Rien ne vérifiait encore ce que voit **un visiteur du site en ligne** : en-têtes de sécurité, simulation réellement fermée, accès refusés sans session. Ces erreurs de déploiement sont faciles à commettre (mauvaise variable, mode de test oublié) et graves avec des élèves réels.

## Décision

1. **`pnpm verifier:site <adresse>`** (`scripts/verifier-site.mts`, logique dans `src/lib/exploitation/verification-site.ts`). La commande est en **lecture seule** :
   - aucune session ni aucun cookie ;
   - seulement des lectures, et deux envois vides vers des API qui doivent les refuser ;
   - rien n'est créé ni modifié.

   Elle donne pour chaque contrôle : réussi, en échec (bloquant) ou avertissement. Elle sort en erreur s'il y a un échec. Le rapport ne contient ni contenu de page, ni nom ou valeur de cookie, ni secret.
2. **Contrôles** :
   - https (http seulement en local avec `--local`) ;
   - page d'accueil ;
   - politique de contenu à nonce avec `'strict-dynamic'`, sans `unsafe-eval`, et nonce différent à chaque requête ;
   - affichage dans un cadre interdit ;
   - `nosniff` et `Referrer-Policy` ;
   - HSTS (avertissement : souvent posé par l'hébergeur) ;
   - cookies Secure et HttpOnly ;
   - santé à 200 et jamais mise en cache ;
   - page de connexion ;
   - boîte de messages simulés fermée (404) ;
   - espaces élève, référent et administration renvoyés vers la connexion ;
   - export des données, question au Professeur, export de l'administration et exécuteur planifié refusés sans session ni jeton (401 ou 403) ;
   - service worker (avertissement).
3. **Essais** :
   - tests unitaires sur un site fictif : site conforme, défauts volontaires, http local, site injoignable ;
   - essai réel contre le serveur local en simulation. Il échoue, comme il se doit, sur « Boîte de messages simulés fermée », et sans `--local`, sur « Adresse en https ».
4. Ajoutée au dossier de production (§3 bis), au guide de mise en route (E3) et à la répétition du pilote (ligne 1).

## Conséquences

- Le premier déploiement aura un contrôle objectif avant la répétition du pilote.
- Les contrôles ne remplacent ni la revue de sécurité, ni `verifier:production`.
