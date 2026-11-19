# 0015 — Connexion, sessions et accès aux données de l'application

- **Date** : 2026-10-04 · **Statut** : appliquée (Jalon 1, étape 4)
- **Accès aux données** : le serveur Next.js se connecte à Postgres avec le rôle `serveur_application`, qui n'a **aucun droit propre**. Pour chaque requête, il prend le rôle `anon` ou `authenticated` avec l'identité de l'utilisateur : les règles d'accès de la base (ADR 0014) s'appliquent exactement comme avec l'API de Supabase. Le mot de passe de ce rôle est créé par le propriétaire, hors dépôt.
- **Connexion** : code à usage unique de 6 chiffres, par SMS (principal) ou par email (secours), sans mot de passe. Deux fournisseurs interchangeables :
  - `supabase` (production) : Supabase Auth envoie et vérifie le code ; il applique aussi les limites d'essais et d'envois. Le fournisseur SMS se configure dans Supabase (à choisir).
  - `simulation` (développement et test **uniquement**) : aucun envoi, code fixe `123456`. Refusé si `ENVIRONNEMENT` n'est pas `developpement` ou `test` ; sans `ENVIRONNEMENT`, l'application se comporte comme en production.
- **Écart avec l'ADR 0003** : par email, on envoie aussi un **code** et non un lien magique (même parcours que le SMS, plus simple sur téléphone quand l'email s'ouvre dans une autre application). **À confirmer par le propriétaire.**
- **Session** : cookie `httpOnly`, `SameSite=Lax`, `Secure` en production, signé (HMAC-SHA256) avec `SECRET_SESSION` (32 caractères au moins), valable 30 jours. L'identifiant en attente de code est gardé 10 minutes dans un cookie, jamais dans l'adresse de la page.
- **Élève mineur** : l'âge de la majorité vient du pack pays (`cadre_legal.age_majorite`). S'il est inconnu (cas du pilote, à vérifier par un juriste), **tout élève est traité comme mineur** : le contact d'un parent ou tuteur est obligatoire et le compte reste en attente jusqu'à son accord.
- **Lien envoyé au parent** : construit avec `URL_PUBLIQUE` (obligatoire en production, pour qu'un en-tête de requête falsifié ne puisse pas fabriquer un lien piégé). L'accord n'est enregistré qu'au clic sur le bouton, pas à la simple ouverture du lien, et le lien ne sert qu'une fois.
- **Envoi des messages** : fournisseur SMS / email à choisir. En développement et en test, les messages sont affichés sur `/developpement/messages` (page inexistante en production).
