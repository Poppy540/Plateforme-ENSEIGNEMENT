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
| 2026-10-04 | Fichier commun de secrets nommé `secrets/commun.env.example` (et non `.env.example`), car les `.env*` sont interdits en lecture | `secrets/README.md` |

## Hypothèses à vérifier

- Les outils cités par les prompts et les skills (escalade, progression, signalement, tickets) n'existent pas encore : à définir (ADR 0006).
- La planification d'entretiens par calendrier (Recruteur) n'a pas de skill : à écrire si besoin.

- Tous les programmes du cadrage sont provisoires (base francophone générique ; Histoire-Géo 6e issue des programmes IPN 1993/1996 ; réforme des curricula en cours depuis 2022).
- Volumes horaires et coefficients : inconnus.
- Classement des matières en couches universel / adaptable / local : hypothèse de travail.
- Classement des tests en `@interdit` / `@pedagogie` : proposition de Claude Code.
- Les 16 skills du Coordinateur sont rédigées par Claude Code à partir de la Partie G : à relire par le propriétaire et les référents.
- Interprétation de « E1 oui » + « crée l'agent COORDINATEUR » : agent créé **et** configuration partagée par famille conservée.

## Questions ouvertes

1. Stack définitive (proposition : Next.js PWA + TypeScript, Supabase, Cloudflare Stream).
2. Fournisseurs avatar, voix, SMS, WhatsApp ; budget par vidéo.
3. Langue du code (proposition : anglais ; domaine en français).
4. Modèle économique du pilote (gratuit ou abonnement Mobile Money).
5. Premier enseignant-référent Maths 3e ; accès aux programmes officiels IPN.
6. **Juriste local (Gabon)** : protection des données, consentement des mineurs, prospection, activité annexe des enseignants du public, contrat de référent, propriété intellectuelle, consentement voix/image. À faire vérifier **avant d'ouvrir à de vrais élèves**.
7. Skills propres au projet encore à écrire (rien d'existant) : français et mineurs, accueil WhatsApp, files d'approbation, pipeline voix/avatar, faible débit, lecture de PDF, sourcing éthique.
8. Séries techniques F/G : à définir avec des enseignants techniques.

## État d'avancement

- 2026-10-04 : 11 skills tierces adaptées (Professeur 2, Scénariste 2, Évaluateur 1, Conformité 2, Coordinateur 1, Support 1, Recruteur 1, commun 1) ; licences jointes.
- 2026-10-04 : cadrage v2 intégré (Partie G) ; 16 skills du Coordinateur rédigées.
- 2026-10-04 : squelette du dépôt créé (docs, CLAUDE.md, memory.md, secrets/ modèles, 10 dossiers d'agents avec prompts, permissions et tests Gherkin, pack Gabon avec 67 unités et le programme pilote Maths 3e, `.claude/settings.json`, `.gitignore`). **Aucun code applicatif.** Lanceur de tests spécifié (`tests/README.md`, `tests/config.yaml`), pas implémenté.

## Prochaine étape

Obtenir les réponses aux questions ouvertes 1 à 4 et 7, puis proposer le plan détaillé du Jalon 1 (connexion téléphone, catalogue filtré, unité Maths 3e, agent Professeur testé TC + PR, validation humaine).
