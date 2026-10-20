# 0045 — Fournisseurs de messages prêts à brancher et dossier de mise en production

- **Date** : 2026-10-20 · **Statut** : technique ; choix des fournisseurs et de l'hébergeur par le propriétaire
- **Tests** : `fournisseurs.test.ts` (contrats), `messagerie.test.ts`, `verification.test.ts` (unitaires), `/api/sante` (bout en bout)

## Décision

1. **Adaptateurs sans dépendance**, choisis par canal dans l'environnement :
   - `FOURNISSEUR_SMS` = `twilio` | `http` ;
   - `FOURNISSEUR_EMAIL` = `brevo` | `http` ;
   - `simulation` seulement en développement et en test locaux.

   Twilio est le seul fournisseur SMS relevé pour le Gabon (`docs/fournisseurs-2026-10.md`). La passerelle `http` (https obligatoire, jeton Bearer) accueille un agrégateur local ou un autre fournisseur sans changer le code. Le canal se déduit du destinataire (email ou numéro).
2. **Tests de contrat** sans réseau : forme exacte de chaque requête, authentification, délai de 10 s, classement des échecs (`refuse`, `temporaire`, `configuration`). Le format des API suit leur documentation publique ; il est à revérifier au premier envoi réel.
3. **Envoi** : une seule nouvelle tentative après un échec temporaire. Une erreur ne contient jamais ni le destinataire, ni le texte, ni un secret. L'objet d'un message de recrutement part séparément du texte (email).
4. **Codes de connexion** : envoyés par Supabase, avec le fournisseur SMS configuré dans Supabase, pas par ces adaptateurs.
5. **`pnpm verifier:production`** : liste ce qui manque à la configuration de production (simulation, https, secrets recopiés du modèle, fournisseurs, vidéo) **sans afficher aucune valeur**.
6. **`GET /api/sante`** pour la surveillance : 200 ou 503, sans donnée.
7. **Dossier `docs/production/`** : décisions préalables, Supabase (API de données fermée), migrations et pack, tâches planifiées, sauvegardes et restauration, déploiement, retour arrière, incident, liste à cocher. Rien n'est déployé.

## Limites

- Aucun envoi réel n'a été fait : le premier se fera sur un numéro de l'équipe, avec l'accord du propriétaire.
- Les modèles de messages (textes envoyés aux parents et aux candidats) restent à approuver.
