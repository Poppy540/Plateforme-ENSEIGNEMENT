# 0056 — Journal d'erreurs sans donnée personnelle

- **Date** : 2026-10-21 · **Statut** : appliqué (Jalon 7, étape 3). Couvre une partie de la condition 6 du pilote : un journal d'erreurs sans donnée personnelle.

## Contexte

Le serveur écrivait quelques événements à la main, sans contenu ni identifiant (ADR 0043). Rien ne garantissait pourtant qu'une erreur imprévue n'écrive jamais un numéro, un email ou un jeton dans les journaux de l'hébergeur, par exemple une erreur de base de données citant une valeur, ou une erreur d'un fournisseur citant une adresse signée. De plus, les erreurs des requêtes n'étaient pas suivies.

## Décision

1. **Un seul journal** (`src/lib/journal.ts`) :
   - une ligne JSON par événement : horodatage, niveau (info, avertissement, erreur), nom de l'événement, quelques champs courts ;
   - **tout texte est nettoyé** : numéros, emails, liens et adresses de connexion de tout protocole (dont `postgresql://…`), identifiants (UUID), jetons et empreintes hexadécimales, jetons JWT, clés d'API, en-têtes `Bearer` et `Basic` ;
   - seule l'empreinte numérique d'erreur produite par Next.js est gardée telle quelle.
2. **Toute la console du serveur est nettoyée** dès le démarrage (`src/instrumentation.ts`, `register`), y compris les messages et les piles d'erreur de Next.js lui-même.
3. **Erreurs de requête** (`onRequestError`), avec seulement :
   - la méthode ;
   - le chemin sans ses paramètres (un lien de parent porte un jeton) ;
   - la route et son type ;
   - le type d'erreur, son message nettoyé et son empreinte.
   - Jamais les en-têtes ni le corps.
   - Une requête interrompue par le navigateur n'est qu'un avertissement.
4. **Service de surveillance facultatif** :
   - `JOURNAL_HTTP_URL` en https et `JOURNAL_HTTP_JETON` ;
   - les **erreurs seulement**, déjà nettoyées, envoyées sans bloquer la requête ni réessayer ;
   - `pnpm verifier:production` exige le https et le jeton dès qu'une adresse est déclarée.
5. **Garde** : un test refuse tout `console.*` direct dans le code de l'application. Tout passe par le journal.

## Vérification

En plus des tests unitaires, les journaux réels du serveur ont été relus pendant un passage complet de bout en bout (85 tests) : aucun numéro, email ni identifiant.

## Conséquences

- Le nettoyage masque aussi des nombres anodins de 4 chiffres ou plus (durées, compteurs) : c'est le prix de la sûreté. Les champs numériques passés au journal ne sont pas touchés.
- Choix du service de surveillance : par le propriétaire, plus tard. Sans lui, les journaux de l'hébergeur suffisent, puisqu'ils sont nettoyés.
