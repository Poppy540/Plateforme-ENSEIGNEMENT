# Plan du Jalon 1

**Objectif (prompt maître §7)** : connexion par téléphone, catalogue filtré par classe, unité pilote Maths 3e avec ses chapitres, un agent Professeur testé avec les batteries TC et PR, et une étape de validation humaine.

**Statut** : proposition, à valider par le propriétaire. Rien n'est déployé ni souscrit pendant ce jalon : tout tourne en local avec des données fictives.

## Étapes (un ou plusieurs petits commits chacune)

| # | Étape | Contenu | Vérification |
|---|---|---|---|
| 1 | Initialisation | Projet Next.js + TypeScript (PWA) dans `application/`, lint, format, tests unitaires (Vitest), tests de bout en bout (Playwright, navigateur déjà installé). Identifiants en français. | `pnpm lint`, `pnpm test` passent ; commandes ajoutées à `CLAUDE.md` |
| 2 | Schéma de données | Migrations SQL (format Supabase) multi-pays : `pays`, `referentiels`, `niveaux`, `series`, `matieres`, `unites`, `unites_series`, `chapitres`, `prerequis_chapitres`, `eleves` (profil minimal, ADR 0004), `consentements`, `approbations`, `progression`, `signalements`. Sécurité au niveau des lignes : un élève ne voit que ses données ; rôle `agent_professeur` limité à son unité et à l'élève connecté. | Tests sur Postgres 16 local : un élève ne lit pas la progression d'un autre ; l'agent ne peut pas valider ni publier |
| 3 | Import du pack pays | Script qui charge `referentiels/<pays>/*.yaml` dans la base. Aucun nom de classe, de série ni décompte dans le code. | Test : le pack Gabon donne 67 unités ; un pack fictif « pays test » se charge sans modifier le code |
| 4 | Connexion | Téléphone + code SMS via Supabase Auth, lien magique email en secours. En développement : **numéros de test** Supabase, aucun SMS réel envoyé. Profil : prénom ou pseudonyme, classe, série si besoin. Élève mineur : saisie du contact d'un parent ou tuteur, compte en attente jusqu'à sa validation. | Tests de bout en bout : inscription, connexion, compte mineur bloqué tant que le parent n'a pas validé |
| 5 | Catalogue | Après connexion : matières et unités filtrées par la classe et la série de l'élève (lues dans le référentiel), possibilité de parcourir les autres classes. Chapitres avec statut « à voir / en cours / terminé ». **Seuls les chapitres validés sont visibles des élèves.** Pages légères, adaptées au faible débit. | Tests : un élève de 3e voit Maths 3e ; un élève de Terminale D ne voit pas les unités C par défaut |
| 6 | Validation humaine | Espace enseignant-référent : liste des chapitres « à valider », valider ou rejeter avec commentaire. Chaque validation est tracée dans `approbations` (valideur, date, version, empreinte). Modifier un élément validé le repasse « à valider ». | Tests : un agent ne peut pas écrire dans `approbations` ; un chapitre modifié perd sa validation |
| 7 | Agent Professeur | Chargeur de prompt : `agents/professeur/prompt.md` + variables du pack pays (ADR 0005), section « valeurs pilote » ignorée, `{{CHAPITRE_EN_COURS}}` fourni par la session (ADR 0006), règles communes et skill `contenu-non-fiable`. Conversation en continu (streaming) dans le chapitre, réponses courtes. Outils : `enregistrerProgression`, `signaler` (escalade vers un humain). Journaux pseudonymisés, jamais de clé journalisée. | Tests unitaires du chargeur (aucune variable non remplie, chapitres non validés exclus) |
| 8 | Lanceur de tests des agents | Exécute TC + PR (`tests/config.yaml`) : 5 exécutions par scénario, vérifications automatiques, évaluateur de type modèle de langage avec grille, seuils 100 % / 90 %, échantillon à relire, rapport dans `tests/resultats/`. Intégration continue (GitHub Actions) relancée à chaque changement de prompt, skill, outil ou modèle. | Rapport complet sur TC + PR ; seuils atteints ou écarts listés |
| 9 | Clôture | Mise à jour de `CLAUDE.md` et `memory.md`, démonstration (captures d'écran), liste des écarts. | Revue par le propriétaire |

## Ce qu'il faut de votre part

1. **Clé API Claude** pour l'étape 7 et 8 : vous la définissez vous-même dans la variable d'environnement `ANTHROPIC_API_KEY` (paramètres de l'environnement de cette session cloud, ou de votre machine). Je ne la vois jamais.
2. **Coût des tests de l'agent** : la batterie TC + PR = 24 scénarios × 5 exécutions, plus l'évaluation de chaque réponse, soit environ 240 appels au modèle par passage. J'estimerai le coût précis avant le premier lancement et je vous demanderai votre accord.
3. **Un référent fictif** joue le rôle de valideur en développement. Les vrais chapitres de Maths 3e restent « à valider » tant qu'un enseignant réel ne les a pas relus.

## Hors Jalon 1

Projet Supabase en ligne, hébergement, envoi réel de SMS, vidéos (Jalon 2), autres agents, paiement (pilote gratuit, ADR 0013).
