# 0003 — Authentification (écart E3)

- **Date** : 2026-10-04 · **Statut** : validée par le propriétaire (fournisseur à confirmer avec la stack)
- **Contexte** : le cadrage cite Firebase Auth, email + mot de passe et Google ; le prompt maître cite Supabase et l'email en alternative.
- **Décision** : téléphone + code SMS (OTP) en principal, lien magique par email en alternative, **sans mot de passe**. Connexion Google éventuellement plus tard. Service géré (Supabase pressenti).
- **Mineurs** : validation d'un parent ou tuteur.
