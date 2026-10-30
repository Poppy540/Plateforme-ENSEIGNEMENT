# 0092 — Corrections de la revue du Jalon 16 et garde-fous automatiques

- **Date** : 2026-10-30 · **Statut** : appliqué (Jalon 16, étape 2).

## Contexte

La revue de sécurité des Jalons 9 à 15 (`docs/securite/revue-jalon-16.md`) a relevé 2 constats moyens, 5 faibles et 2 pour information, sans rien de critique ni d'élevé. Cinq constats se corrigent sans décision du propriétaire (S1, S4, S5, S6, S7). Elle proposait aussi des garde-fous automatiques, pour que les règles ne dépendent plus d'une relecture.

## Décision

1. **S1, limite d'essais sur les codes** :
   - La saisie d'un code de classe (élève), d'une invitation d'enseignant ou d'une invitation de référent est limitée à **10 essais par compte et par jour** (`ESSAIS_CODE_INVITATION`).
   - Le mécanisme est celui des limites de connexion (`limiter_connexion`), avec deux natures ajoutées : `code_classe` et `code_invitation`.
   - La clé est une empreinte salée du compte, jamais le code saisi.
   - Au-delà de 10 essais : « Trop d'essais de code aujourd'hui. Réessayez demain. »
2. **S4, téléchargement du rapport de fin** :
   - Le geste « rapport téléchargé » n'est noté que pour une demande venue de la plateforme : `Sec-Fetch-Site: same-origin`, sinon un `Referer` de même origine.
   - Le fichier reste servi dans tous les cas.
   - La vérification est dans `src/lib/securite/meme-origine.ts`, une fonction pure testée.
3. **S5, vérification du site** : `pnpm verifier:site` contrôle aussi que `/api/administration/semaine` et `/api/administration/fin-pilote` refusent toute demande sans session.
4. **S6, droit inutile** : le droit d'exécution de `public` sur la fonction de déclencheur `videos_avant_insertion` est retiré (migration 0047).
5. **S7, textes libres de l'équipe** : un nouveau traitement **T12 « Suivi du pilote par l'équipe »** est inscrit au registre du dossier du juriste. Il dit que les noms ne sont pas masqués. Le guide de mise en route le rappelle (H). Aucune détection automatique des noms : elle serait trop peu fiable.
6. **Garde-fous automatiques** (`supabase/tests/76_tests_garde_fous.sql`, dans `pnpm test:base`) :
   - **GF01** : toute fonction `security definer` du schéma `public` a un `search_path` fixé, et aucune n'est exécutable par `public`.
   - **GF02** : seules les 14 fonctions d'une liste blanche justifiée sont exécutables par le visiteur (`anon`) : liens des parents à jeton, connexion et session, rôle courant, catalogue.
   - **GF03** : toutes les tables ont la sécurité au niveau des lignes, et le visiteur ne lit que les tables du catalogue.

   Chaque garde-fou a été vérifié **en négatif** : sur une base où l'on retire une règle (droit au visiteur, sécurité des lignes désactivée, lecture d'une table privée, migration corrective absente), le test échoue et nomme l'objet en cause.

## Conséquences

- Toute migration future qui ouvre une fonction ou une table par erreur fait échouer `pnpm test:base`.
- Ouvrir volontairement une fonction au visiteur demande d'ajouter son nom à la liste blanche de GF02, donc une décision visible dans la revue du code.
- Les tests de bout en bout qui demandent le rapport de fin par programme envoient `Sec-Fetch-Site: same-origin`.
- Le dossier du juriste publié en ligne (version 3) ne contient pas encore T12. Il est à republier si le propriétaire le souhaite.

## Tests

- Base : GF01 à GF03, migration 0047 (natures de limites).
- Unitaires : demande de même origine (Sec-Fetch-Site, Referer, cas limites) ; vérification de site (nouvelles routes).
- Bout en bout :
  - 10 codes faux, puis le bon code refusé jusqu'au lendemain, sans trace du code saisi ;
  - téléchargement venu d'un autre site non noté, téléchargement depuis la plateforme noté ;
  - parcours existants inchangés : 115 tests.
