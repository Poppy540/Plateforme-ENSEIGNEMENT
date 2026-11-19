# 0011 — Stack technique

- **Date** : 2026-10-04 · **Statut** : validée par le propriétaire
- **Décision** :
  - Application web mobile-first en **PWA** : **Next.js** + **TypeScript**.
  - **Supabase** : authentification (téléphone + code SMS, lien magique email), Postgres, recherche vectorielle (pgvector), sécurité au niveau des lignes (RLS) et un rôle restreint par agent.
  - **Cloudflare Stream** : vidéo adaptative et faible débit (à partir du Jalon 2).
  - Modèles Claude via l'API Anthropic, clé lue dans `ANTHROPIC_API_KEY` (hors dépôt).
- **Restent à choisir** (avant toute souscription, avec accord du propriétaire) : hébergement de l'application, fournisseur SMS, avatar, voix, WhatsApp Business.
- **Développement** : base Postgres locale pour les migrations et les tests de sécurité ; aucun service payant ni déploiement sans accord.
