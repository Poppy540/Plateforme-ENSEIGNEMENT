# memory.md — mémoire de travail

À relire au début de chaque session, à mettre à jour à la fin. **Jamais de secret ni de donnée d'élève, de parent ou de candidat ici.** Version courte, avec les rubriques demandées par le prompt du propriétaire (décisions validées avec date, hypothèses à vérifier, questions ouvertes, état d'avancement, prochaine étape) ; le détail complet et daté de tout ce qui précède le 2026-11-12 est dans [`docs/historique.md`](docs/historique.md), ce qui attend le propriétaire dans [`docs/attentes-proprietaire.md`](docs/attentes-proprietaire.md).

## Méthode de travail avec le propriétaire

- Il choisit la suite par « oui, propose le plan de la suite » : je propose des pistes (AskUserQuestion, une recommandée), puis j'écris le plan, son ADR et cette page, je commite et je pousse. Chaque étape ne commence que sur « oui, commence l'étape 1 » ou « oui, continue avec l'étape N ».
- Une décision du propriétaire (D1, D2…) se présente avec AskUserQuestion et une recommandation ; elle est appliquée puis écrite dans un ADR.
- **Comptes rendus uniquement en français**, messages intermédiaires compris (demande du propriétaire). S'il dit d'arrêter, j'arrête.
- Petits commits en français, terminés par les lignes `Co-Authored-By` et `Claude-Session` ; `git push -u origin claude/gabon-education-platform-ldrr4p` ; aucune demande de fusion sans demande explicite.
- Avant chaque envoi qui touche l'application : `pnpm controler` (au moins `--rapide`), puis vérifier le passage GitHub Actions (API publique par `curl`, ou les outils GitHub).
- Bilans avec captures Playwright (`pnpm demo:captures tests/demo/<fichier>`), compressées par `bash scripts/compresser-captures.sh`.

## Règles qui ne bougent pas

- Droits de Claude Code : `CLAUDE.md`, §5.3. Jamais lire, afficher, copier ni commiter une valeur de secret ; la clé API vient de `ANTHROPIC_API_KEY`, posée par le propriétaire. Rien déployé, dépensé ou souscrit sans son accord explicite.
- Données fictives seulement (numéros `+999 …`, pays fictifs `zz`, `yy`, `qq`). Aucun prompt d'agent réécrit sans accord.
- Rien de propre à un pays dans le code : un test de garde cherche les noms de pays, d'examens, de classes et d'institutions dans `src/`, `supabase/migrations/` et `scripts/`.
- Chaque donnée d'un pack a sa ligne dans `SOURCES.md` ; rien n'est inventé : sans source, la donnée reste vide et « manquant ».

## Décisions validées

Principes en vigueur (toutes les décisions datées : `docs/historique.md`, « Décisions validées (par date) ») :

| Date       | Décision                                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-04 | Stack Next.js PWA + TypeScript, Supabase (Postgres, RLS, un rôle par agent), Cloudflare Stream ; code et données en français |
| 2026-10-04 | Pack pays pour tout ce qui dépend d'un pays ; une unité = (référentiel, niveau, séries, matière) ; pilote gratuit            |
| 2026-10-04 | Un humain (référent) valide tout contenu avant les élèves ; le Recruteur n'envoie qu'après approbation enregistrée           |
| 2026-10-26 | L'enseignant de la classe ne voit que des chiffres d'ensemble, jamais rien sous 5 élèves (ADR 0063)                          |
| 2026-11-10 | Un déploiement sert un pays : paquet par pays, fuseau de la base = fuseau du pays (ADR 0114)                                 |

Décisions du propriétaire (D1 à D16) :

| Date       | Décision | Contenu                                                                                                                                                                                            | ADR  |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 2026-10-21 | D1 à D9  | Revue de sécurité : API de données fermée, résumés après suppression, purge étendue, sel d'opposition, indicatifs du pack, sessions révocables, approbations par famille, CSP, documents officiels | 0049 |
| 2026-10-30 | D10 c    | Capacité de chaque classe, alerte quand elle est pleine                                                                                                                                            | 0093 |
| 2026-10-30 | D11 a    | Chiffres de l'enseignant à jour à chaque lecture (gel hebdomadaire si le juriste le demande)                                                                                                       | 0093 |
| 2026-10-30 | D12 a    | Sauvegardes chiffrées avec `age`, clé privée hors du serveur                                                                                                                                       | 0093 |
| 2026-10-30 | D13 a    | La preuve de la condition 6 comprend le `CONTROLE.md` du paquet (« contrôle complet réussi »)                                                                                                      | 0097 |
| 2026-11-02 | D14 b    | Hors ligne étendu : Mes cours, matière, plan, corrections ; jamais un quiz à faire ; copies effacées après 7 jours                                                                                 | 0101 |
| 2026-11-02 | D15 a    | « Commencé » noté par la plateforme à l'ouverture de la leçon ou au quiz                                                                                                                           | 0103 |
| 2026-11-09 | D16 a    | Obtenir le curriculum de Maths 3e ; pack prêt pour des compétences, rien ajouté en attendant                                                                                                       | 0109 |
| 2026-11-11 | Jalon 23 | Remise en ordre (plan en cours)                                                                                                                                                                    | 0115 |

## Hypothèses à vérifier

Toujours ouvertes au 2026-11-12 (les hypothèses réglées depuis sont dans `docs/historique.md`) :

- Durées de conservation (365 / 30 / 730 jours ; purge étendue non fixée) et sort des résumés après suppression : à valider par un juriste.
- Âge de la majorité au Gabon inconnu : tout élève est traité comme mineur jusqu'à l'avis du juriste.
- Copies gardées 7 jours sur le téléphone (D14) : à confirmer par le juriste (Q20).
- Valeurs provisoires du pack (Professeur Maths 3e, FAQ, délais, recrutement, seuils du pilote) proposées par Claude Code : à valider par le propriétaire et le référent.
- Tous les programmes du pack Gabon sont provisoires (base francophone générique) ; volumes horaires et coefficients inconnus ; le programme officiel de 3e est introuvable en ligne (Jalon 21).
- Classement des matières en couches universel / adaptable / local, et des tests en `@interdit` / `@pedagogie` : propositions de Claude Code.
- Les 16 skills du Coordinateur et les skills « élèves mineurs » et « files d'approbation » : rédigées par Claude Code, à relire.
- Email : code à 6 chiffres au lieu d'un lien magique (écart avec l'ADR 0003, à confirmer par le propriétaire).
- Temps indicatifs de la liste d'attentes (ADR 0116) : estimations de Claude Code.

## Questions ouvertes

1. Fournisseurs : hébergement, SMS, avatar, voix, WhatsApp ; budget par vidéo.
2. Premier enseignant-référent de Maths 3e ; curriculum officiel (lettre prête, D16).
3. Juriste local : dossier prêt à envoyer (protection des données, mineurs, Q19 enseignant de la classe, Q20 copies sur le téléphone, durées).
4. Skills propres au projet encore à écrire : français, accueil WhatsApp, pipeline voix/avatar, lecture de PDF, sourcing éthique ; planification d'entretiens pour le Recruteur.
5. Séries techniques F/G : à définir avec des enseignants techniques.
6. Heures du journal de l'administration à l'heure du pays ? (bilan du Jalon 22, facultatif).

## Environnement et pièges connus

- **Environnement cloud « Poppy »** (personnel) : hôtes ajoutés avec accord (www.fomesoutra.com, info241.com, gabonmediatime.com, www.gabonreview.com, lunion-archives.org, www.lunion-archives.org) ; script de démarrage `pnpm install --frozen-lockfile` dans `Plateforme-ENSEIGNEMENT/application`. WebFetch ne passe pas par le proxy : utiliser `curl` ; `fetch` de Node demande `NODE_USE_ENV_PROXY=1`.
- **Navigateur** : Chromium préinstallé ; `pnpm test:e2e` le trouve sans `CHEMIN_CHROMIUM`.
- **Imports** : dans `src/lib/pack-pays/` et `src/lib/production/`, les imports locaux portent l'extension `.ts` (scripts lancés par `node`).
- **Prettier** : ne jamais le lancer sur `CLAUDE.md` (il déforme le §5 du propriétaire) ; lancé sur un dossier entier de `referentiels/`, il reformate des fichiers qui ne le sont pas : ne viser que les fichiers modifiés.
- **Tests de bout en bout qui partagent la base** :
  - prendre une tranche de numéros libre (déjà prises jusqu'à `+999 000 041 xx`) et un chapitre qu'aucun autre test ne cite ;
  - `zz-an3-mathematiques` : `portabilite.spec.ts` y compte 2 chapitres validés sur 3 ;
  - `zz-an2-mathematiques/proportions` : réservé à `journee-pays-z.spec.ts` ;
  - `ga-5e-mathematiques/statistiques-moyenne` : réservé à `journee-ouverture.spec.ts` ;
  - la file humaine contient les signalements des autres tests : viser un signalement par son identifiant.
- **Next** : une page qui redirige selon la base doit lire la session d'abord, sinon elle est pré-rendue au build. `session_active` n'est accordée qu'à `anon`.
- **Hors ligne** : `context.setOffline` ne coupe pas le service worker : refuser aussi les requêtes par `context.route`.
- **Jour** : la base est la seule horloge du jour (`aujourdhui()`) ; la base locale reste en UTC.
- **Mots interdits par le test de garde** dans le code : écrire « examen de fin de 3e » ou « institution chargée des programmes » plutôt qu'un nom d'examen ou d'institution.

## État d'avancement

- **Jalons 1 à 22 faits** ; **Jalon 23 (remise en ordre) en cours** : plan [`docs/plans/jalon-23.md`](docs/plans/jalon-23.md). Bilans dans `docs/bilans/`, décisions dans `docs/decisions/` (ADR 0001 à 0117).
- **La plateforme est construite et testée en simulation** : inscription avec accord du parent, catalogue, leçons, quiz, professeur IA, plan de révision, hors ligne, espaces du référent, de l'enseignant et de l'administration, pilotage complet du pilote (conditions, critères, semaine, fin, clôture), dix agents simulés, exploitation (sauvegardes chiffrées, migrations suivies, paquet, répétition générale), deux packs (Gabon, pays fictif Z) et un modèle pour en ajouter.
- **Rien n'est déployé, rien n'est souscrit, aucun élève réel.** Rien de technique ne bloque le pilote : ce qui reste dépend du propriétaire (liste par urgence).
- **Jalons suspendus** : Jalon 21, étapes 2 et 3 (programme du pilote complet) attendent le curriculum de Maths 3e ; l'étape « passages réels des agents » des Jalons 13 à 23 attend la clé API, la relecture des deux skills et l'accord sur le coût (~121 USD).
- **Derniers chiffres** (2026-11-11) : 355 tests unitaires, 150 scénarios de base, 128 de bout en bout ; `pnpm controler` 10 / 10 ; GitHub Actions vert.
- **Journal détaillé** : une ligne par étape faite, en tête de « État d'avancement » dans `docs/historique.md`.

## Prochaine étape

Jalon 23, étape 3 (documents périmés, `README.md` en porte d'entrée, contrôle des liens internes) sur « oui, continue avec l'étape 3 ». Reprise du Jalon 21 dès que le curriculum arrive ; passages réels dès la clé.
