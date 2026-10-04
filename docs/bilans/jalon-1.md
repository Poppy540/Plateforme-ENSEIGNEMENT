# Bilan du Jalon 1

**Date** : 2026-10-04 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement, rien n'est déployé ni souscrit.

## 1. Objectif et résultat

Objectif (prompt maître §7) : connexion par téléphone, catalogue filtré par classe, unité pilote Maths 3e (Gabon) avec ses chapitres, un agent Professeur testé avec les batteries TC et PR, une étape de validation humaine.

| Objectif | État | Remarque |
|---|---|---|
| Connexion par téléphone (code SMS) | **Fait** | Testé en mode simulation (code 123456). En vrai : Supabase Auth + fournisseur SMS **à choisir**. |
| Catalogue filtré par classe et série | **Fait** | Classes, séries et matières lues dans le pack pays ; seuls les chapitres validés sont visibles. |
| Unité pilote Maths 3e et ses chapitres | **Fait, contenu provisoire** | 7 chapitres du cadrage, tous « à valider » tant qu'un enseignant réel ne les a pas relus. |
| Agent Professeur | **Fait** | Conversation en flux dans un chapitre, outils « progression » et « signaler », périmètre verrouillé en base. |
| Testé avec TC + PR | **Prêt, non lancé** | Lanceur et 24 scénarios prêts ; le passage réel attend la clé API et votre accord sur le coût (~0,18 USD pour un mini-essai, ~9 USD pour le passage complet). |
| Validation humaine | **Fait** | Espace enseignant-référent : valider ou rejeter un chapitre, trace complète, validation liée à la version relue. |

**Le Jalon 1 sera clos** quand le passage réel TC + PR aura atteint les seuils (100 % interdits, 90 % pédagogie) et qu'un échantillon aura été relu par un humain.

## 2. Démonstration (captures sur téléphone, données fictives)

Régénérables avec `cd application && pnpm demo:captures`.

| | Écran |
|---|---|
| 01 | [Accueil](../demo/jalon-1/01-accueil.png) |
| 02-03 | [Connexion](../demo/jalon-1/02-connexion.png) · [code SMS](../demo/jalon-1/03-code-sms.png) |
| 04-05 | [Inscription minimale](../demo/jalon-1/04-inscription.png) · [compte en attente du parent](../demo/jalon-1/05-attente-accord-parent.png) |
| 06-07 | [Accord du parent](../demo/jalon-1/06-accord-parent.png) · [compte actif](../demo/jalon-1/07-compte-actif.png) |
| 08-09 | [Catalogue de 3e](../demo/jalon-1/08-catalogue-3e.png) · [chapitres validés](../demo/jalon-1/09-chapitres-maths-3e.png) |
| 10 | [Conversation avec le professeur (modèle simulé)](../demo/jalon-1/10-conversation-professeur-simule.png) |
| 11-13 | [Activation du référent](../demo/jalon-1/11-activation-referent.png) · [espace référent](../demo/jalon-1/12-espace-referent.png) · [validation d'un chapitre](../demo/jalon-1/13-validation-chapitre.png) |

## 3. Ce que vérifient les tests

| Série | Nombre | Commande |
|---|---|---|
| Tests unitaires | 44 | `pnpm test` |
| Base de données : règles d'accès, échanges, import des packs, référents | 15 + 2 + 3 + 4 scénarios | `pnpm test:base` |
| Bout en bout sur téléphone simulé | 23 | `pnpm test:e2e` |
| Agents (mécanique, sans coût) | 24 scénarios × 5 | `pnpm test:agents` |

Garde-fous vérifiés automatiquement, entre autres : un élève ne voit que ses données ; rien n'est visible sans validation ; seul le référent de la famille valide, et seulement la version qu'il a lue ; l'agent Professeur ne peut ni valider, ni lire les autres élèves, ni écrire hors de son unité ; un mineur reste bloqué sans l'accord d'un parent ; aucun nom de pays, de série, d'examen, d'indicatif ni de monnaie dans le code.

## 4. Écarts avec le cadrage et le prompt maître

| Écart | Statut |
|---|---|
| Firebase Auth (cadrage) → Supabase Auth | Validé (E3, ADR 0003) |
| Email : **code à 6 chiffres** au lieu d'un lien magique | **À confirmer** (ADR 0015) |
| 10e agent Coordinateur de famille | Validé, intégré au cadrage (Partie G) |
| Fichier `secrets/commun.env.example` au lieu de `.env.example` | Technique (règle de lecture des `.env*`) |
| Classement des tests en « interdit » / « pédagogie » | **À valider** |
| Entrées concrètes des 24 scénarios (`agents/professeur/tests/entrees.yaml`) rédigées par Claude Code | **À relire** |
| Valeurs provisoires du Professeur Maths 3e (nom affiché, persona, référent) | **À valider** |
| Programme pilote sans sous-thèmes, volumes horaires ni coefficients | En attente du référent et de l'IPN |
| Vidéos | Prévu au Jalon 2 |

## 5. Limites connues avant d'ouvrir à de vrais élèves

1. **Suppression et export des données d'un utilisateur, durée de conservation** (prompt maître §6) : **pas encore construits**. À faire avant tout pilote réel, avec l'avis du juriste.
2. **Juriste local** : majorité, consentement des mineurs, conservation des échanges, prospection, contrats. Tant que l'âge de la majorité est inconnu, tout élève est traité comme mineur.
3. **Supabase réel non testé** : les migrations ont été testées sur Postgres avec une simulation de la partie authentification de Supabase. Un premier essai sur un projet Supabase (gratuit, de développement) sera nécessaire.
4. **Envoi réel de SMS et des liens aux parents** : fournisseur à choisir ; en développement les messages s'affichent à l'écran.
5. **En-têtes de sécurité du site** (politique de contenu, etc.) et limites d'essais de connexion : à ajouter au moment de l'hébergement (Supabase limite déjà les essais de code).
6. **Le quota de questions** est compté par unité, pas globalement.
7. **Les tests d'agents utilisent des outils simulés** ; l'évaluateur automatique peut se tromper, d'où la relecture humaine de l'échantillon.

## 6. Décisions et actions attendues du propriétaire

1. Ajouter `ANTHROPIC_API_KEY` dans les paramètres de l'environnement (jamais dans la conversation), puis donner votre accord pour le mini-essai (~0,18 USD) et le passage complet TC + PR (~9 USD).
2. Valider : valeurs provisoires du Professeur, entrées de test, classement interdit / pédagogie, code par email.
3. Trouver le premier enseignant-référent de Maths 3e (kit : `docs/recrutement/`) et l'accès aux programmes de l'IPN.
4. Identifier un juriste au Gabon.
5. Pour le Jalon 2 : fournisseurs d'avatar, de voix et d'hébergement vidéo, et budget par vidéo (comparatif chiffré à préparer avant toute souscription).
