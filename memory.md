# memory.md — mémoire de travail

À relire au début de chaque session, à mettre à jour à la fin. **Jamais de secret ni de donnée d'élève, de parent ou de candidat ici.**

## Décisions validées

| Date | Décision | Référence |
|---|---|---|
| 2026-10-04 | Pack pays : rien de propre à un pays dans le code | ADR 0001 |
| 2026-10-04 | Une unité peut couvrir plusieurs séries (A1/A2) → 67 unités au Gabon | ADR 0002 (E2) |
| 2026-10-04 | Connexion téléphone + code SMS, lien magique email, sans mot de passe | ADR 0003 (E3) |
| 2026-10-04 | Inscription : prénom ou pseudonyme, pas de nom de famille, établissement facultatif | ADR 0004 (E4) |
| 2026-10-04 | Prompt Professeur recopié tel quel, valeurs d'unité dans le pack pays | ADR 0005 (E5) |
| 2026-10-04 | Chapitre en cours fourni par la session ; outils définis à part | ADR 0006 (E6) |
| 2026-10-04 | Allemand LV2 hors décompte | ADR 0007 (E7) |
| 2026-10-04 | Création d'un 10e agent, Coordinateur par famille de matières, + configuration partagée par famille | ADR 0008 (E1) |
| 2026-10-04 | Cadrage mis à jour par le propriétaire : Partie G (Coordinateur de famille : prompt, compétences, 16 skills, droits, tests CM) ; prompt maître à dix agents. Prompt, droits et tests du Coordinateur alignés dessus (CD remplacés par CM) | ADR 0008 |
| 2026-10-04 | Coordinateurs de famille mis en service après le Jalon 3, dès qu'une famille compte plusieurs unités (prompt maître §7) | prompt maître |
| 2026-10-04 | Licence CC BY-SA 4.0 acceptée pour les skills dérivées de Gareth Manning ; liste des skills (docs/skills-recherche-2026-10-04.md) validée | docs/decisions/0009-skills-tierces.md |
| 2026-10-04 | Recrutement : le Recruteur prépare et transmet, le propriétaire décide et finalise ({{RESPONSABLE}} = propriétaire) | ADR 0010 |
| 2026-10-04 | Le Recruteur envoie messages et invitations lui-même, uniquement après validation enregistrée du propriétaire (envoi bloqué techniquement sinon) | ADR 0010 |
| 2026-10-04 | Stack : Next.js PWA + TypeScript, Supabase, Cloudflare Stream | ADR 0011 |
| 2026-10-04 | Code en français (identifiants sans accents) | ADR 0012 |
| 2026-10-04 | Pilote gratuit, pas de paiement | ADR 0013 |
| 2026-10-04 | Plan du Jalon 1 validé | docs/plans/jalon-1.md |
| 2026-10-04 | Fichier commun de secrets nommé `secrets/commun.env.example` (et non `.env.example`), car les `.env*` sont interdits en lecture | `secrets/README.md` |

## Hypothèses à vérifier

- Valeurs provisoires du Professeur Maths 3e (nom affiché, persona, référent) proposées par Claude Code : à valider par le propriétaire.

- Email : code à 6 chiffres au lieu d'un lien magique (écart avec l'ADR 0003, à confirmer par le propriétaire).
- Âge de la majorité au Gabon inconnu : tout élève est traité comme mineur jusqu'à confirmation par un juriste.

- Les outils cités par les prompts et les skills (escalade, progression, signalement, tickets) n'existent pas encore : à définir (ADR 0006).
- La planification d'entretiens par calendrier (Recruteur) n'a pas de skill : à écrire si besoin.

- Tous les programmes du cadrage sont provisoires (base francophone générique ; Histoire-Géo 6e issue des programmes IPN 1993/1996 ; réforme des curricula en cours depuis 2022).
- Volumes horaires et coefficients : inconnus.
- Classement des matières en couches universel / adaptable / local : hypothèse de travail.
- Classement des tests en `@interdit` / `@pedagogie` : proposition de Claude Code.
- Les 16 skills du Coordinateur sont rédigées par Claude Code à partir de la Partie G : à relire par le propriétaire et les référents.
- Interprétation de « E1 oui » + « crée l'agent COORDINATEUR » : agent créé **et** configuration partagée par famille conservée.

## Questions ouvertes

1. Fournisseurs hébergement, SMS, avatar, voix, WhatsApp ; budget par vidéo (Jalon 2).
2. Premier enseignant-référent Maths 3e ; accès aux programmes officiels IPN.
3. **Juriste local (Gabon)** : protection des données, consentement des mineurs, prospection, activité annexe des enseignants du public, contrat de référent, propriété intellectuelle, consentement voix/image. À faire vérifier **avant d'ouvrir à de vrais élèves**.
4. Skills propres au projet encore à écrire (rien d'existant) : français et mineurs, accueil WhatsApp, files d'approbation, pipeline voix/avatar, faible débit, lecture de PDF, sourcing éthique.
5. Séries techniques F/G : à définir avec des enseignants techniques.

## État d'avancement

- 2026-10-04 : Jalon 1, étape 8 faite (sans clé) — lanceur des tests des agents (`pnpm test:agents`) : 24 scénarios TC + PR convertis en entrées concrètes (`agents/professeur/tests/entrees.yaml`, à relire), 5 exécutions, contrôles automatiques + évaluateur LLM à sortie JSON, seuils 100 %/90 %, échantillon de relecture humaine, rapport, estimation du coût (~9 USD par passage complet), garde-fou `--confirmer`, intégration continue (mécanique toujours, passage réel sur activation du propriétaire). ADR 0018. 44 tests unitaires.

- 2026-10-04 : Jalon 1, étape 7 faite (sans clé API) — agent Professeur : chargeur de prompt (cadrage + pack + §5.1 + 3 skills), boucle avec outils `enregistrer_progression` et `signaler`, rôle `agent_professeur`, échanges conservés, quota, page de chapitre avec conversation en flux, modèle simulé pour les tests (ADR 0017). Tests : 37 unitaires, base (accès, échanges, import, référents), 23 de bout en bout. Correction : secret de session de développement identique pour toutes les parties du serveur.

- 2026-10-04 : Jalon 1, étape 6 faite — accès référent par invitation à usage unique (`pnpm referent:invitation`), espace `/referent` (chapitres à valider de ses familles, détail, valider/rejeter avec commentaire, historique), validation liée à la version relue (faille « version nulle » corrigée), saisies conservées après une erreur de formulaire, indicatif +241 retiré du code (garde-fou renforcé). ADR 0016. Tests : 25 unitaires, 19 en base + 4 référents, 17 de bout en bout.

- 2026-10-04 : Jalon 1, étape 5 faite — catalogue (`/catalogue`, `/catalogue/<unité>`) : matières de la classe et de la série de l'élève, chapitres validés seulement, statut à voir / en cours / terminé, parcours d'une autre classe, accès réservé aux comptes actifs, page 404 en français. 13 tests de bout en bout passent.

- 2026-10-04 : Jalon 1, étape 4 faite — connexion par code (SMS ou email) avec fournisseur Supabase (production) ou simulation (développement/test, code 123456), session signée, inscription minimale, âge de la majorité lu dans le pack (inconnu = mineur), validation parentale par lien à usage unique, accès aux données par le rôle `serveur_application` sans droit propre (ADR 0015). Tests : 21 unitaires, 15 d'accès + 3 d'import en base, 8 de bout en bout.

- 2026-10-04 : Jalon 1, étape 3 faite — lecteur et contrôle des packs (`application/src/lib/pack-pays/`), génération d'un SQL d'import idempotent qui ne valide rien (`pnpm pack:sql`). Tests : pack Gabon = 67 unités, pack fictif « yy » (structure différente) chargé sans modifier le code, pack invalide refusé, garde-fou « aucun nom de pays dans le code », import réel en base (deux fois sans doublon) et repassage « à valider » après modification.

- 2026-10-04 : Jalon 1, étape 2 faite — 4 migrations Supabase (`application/supabase/migrations/`) : référentiels multi-pays, comptes minimaux, consentements, progression, approbations, signalements, règles d'accès, rôle `agent_professeur` (ADR 0014). 14 tests d'accès passent sur Postgres 16 local (`pnpm test:base`) ; deux règles volontairement affaiblies font bien échouer les tests.

- 2026-10-04 : Jalon 1, étape 1 faite — `application/` (Next.js 16 + TypeScript, PWA : manifeste et icône, français, sans police téléchargée), ESLint, Prettier, Vitest, Playwright ; lint, types, test unitaire et 2 tests de bout en bout passent.

- 2026-10-04 : 11 skills tierces adaptées (Professeur 2, Scénariste 2, Évaluateur 1, Conformité 2, Coordinateur 1, Support 1, Recruteur 1, commun 1) ; licences jointes.
- 2026-10-04 : cadrage v2 intégré (Partie G) ; 16 skills du Coordinateur rédigées.
- 2026-10-04 : squelette du dépôt créé (docs, CLAUDE.md, memory.md, secrets/ modèles, 10 dossiers d'agents avec prompts, permissions et tests Gherkin, pack Gabon avec 67 unités et le programme pilote Maths 3e, `.claude/settings.json`, `.gitignore`). **Aucun code applicatif.** Lanceur de tests spécifié (`tests/README.md`, `tests/config.yaml`), pas implémenté.

## Prochaine étape

Jalon 1, étape 9 : clôture (démonstration, écarts). En attente du propriétaire : clé ANTHROPIC_API_KEY + accord sur le coût pour le mini-essai (~0,18 USD) puis le passage complet TC + PR (~9 USD) ; validation des valeurs provisoires du Professeur et des entrées de test.
