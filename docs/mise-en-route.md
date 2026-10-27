# Guide de mise en route du propriétaire — de zéro au pilote

**Pour** : le propriétaire. **Préparé par** Claude Code (Jalon 8, étape 2), le 2026-10-22.
**Point de départ** : la plateforme est construite et testée en simulation. Rien n'est déployé, rien n'est souscrit, aucun élève réel.

Ce guide met dans l'ordre tout ce qui reste à faire, avec pour chaque étape : ce qu'il faut décider ou faire, qui contacter, les commandes, une durée **indicative** et ce qui la bloque. Il rassemble le [dossier de production](production/README.md), les [12 conditions du pilote](pilote/README.md) et les bilans des Jalons 5 à 7. Les commandes se lancent depuis `application/`.

## Le chemin le plus court

Trois fils avancent en parallèle ; le pilote ne commence que lorsque les trois sont au bout.

```
Fil 1 — Droit       A1 → B1 juriste ─────────────► B2 avis appliqué ──┐
Fil 2 — Contenus    A2 → C1 clé API → C2 essais ─► D1 référents → D2 contenus validés ──┤──► G répétition ─► H pilote
Fil 3 — Technique   A3 → E1 fournisseurs → E2 déploiement → E3 essais réels ──────────┘
                    F établissement et équipe de veille (dès que B1 a commencé) ───────┘
```

**Ce qui prend le plus de temps** : trouver un juriste et des référents. Ces deux démarches sont à lancer **dès cette semaine**.

## A. Cette semaine — sans dépense, sans attendre personne

| # | Quoi | Comment | Durée |
|---|---|---|---|
| A1 | **Relire le [dossier pour le juriste](juridique/dossier-juriste.md)**, puis le transmettre (version en ligne : la partager depuis sa page) | Corriger ce qui est inexact sur vous (rôle, structure juridique) ; vérifier la référence de la loi gabonaise | 1 h |
| A2 | **Valider ou corriger** : <br>• les 9 questions du [questionnaire anonyme](../referentiels/gabon/questionnaire.yaml) ; <br>• les valeurs provisoires des agents (personas, noms affichés, contexte local) ; <br>• la FAQ du Support et le délai de réponse aux tickets | Dites à Claude Code ce qu'il faut changer : il met à jour le pack et `SOURCES.md` | 2 h |
| A3 | **Ouvrir les démarches longues** : chercher un juriste au Gabon (protection des données, mineurs, droit du travail des enseignants), un établissement partenaire et des enseignants-référents | Par votre réseau ; le recrutement assisté (agent Recruteur) attend l'avis du juriste (Q16) | En continu |
| A4 | **Choisir le cadre du pilote** : une classe de 3e, quelles matières (Maths d'abord), quelles dates | Décision ; elle fixe les contenus à faire valider en priorité | 30 min |

## B. Droit

| # | Quoi | Qui | Bloque | Durée |
|---|---|---|---|---|
| B1 | **Avis du juriste** sur les 19 questions du dossier : formalités (CNPDCP), âge et forme du consentement, transferts, durées de conservation, détresse, contrats des référents, prospection, SMS | Juriste | Condition 1 ; toute inscription réelle ; le Recruteur ; la purge | 2 à 6 semaines |
| B2 | **Appliquer l'avis** : <br>• durées et sort des résumés dans `referentiels/gabon/pays.yaml` (`conservation`), puis réimport du pack ; <br>• fiche d'information et consentements mis à jour ; <br>• formalités auprès de l'autorité si elles sont exigées | Claude Code pour le pack et les textes ; vous pour les formalités | Condition 10 | 1 à 3 jours |

## C. Clé API et essais réels des agents

| # | Quoi | Commandes | Coût | Durée |
|---|---|---|---|---|
| C1 | **Créer une clé API Claude** sur la console Anthropic, avec une limite de dépense mensuelle. La mettre dans l'environnement (`ANTHROPIC_API_KEY`), **jamais** dans une conversation ni dans le dépôt | — | Selon l'usage | 30 min |
| C2 | **Mini-essais** : 1 exécution de quelques scénarios par agent, pour vérifier que tout fonctionne avec le vrai modèle | `MODE_MODELE=anthropic pnpm test:agents --estimer`, puis, après votre accord sur le chiffre affiché : `MODE_MODELE=anthropic pnpm test:agents --confirmer --executions 1 --scenarios …` | Quelques USD | 1 h |
| C3 | **Séries complètes** (5 exécutions par scénario), seuils 100 % pour les interdits et 90 % pour la pédagogie ; corrections des skills et des contrôles par Claude Code (jamais des prompts sans votre accord) | `MODE_MODELE=anthropic pnpm test:agents --confirmer` | ~119 USD, dont ~10 USD pour les tests du Français (ADR 0060) et ~4 USD pour les élèves mineurs (ADR 0068). Avant : relire la skill « élèves mineurs » (`agents/_commun/skills/eleves-mineurs/SKILL.md`) | 1 à 2 jours |

C2 et C3 remplissent une partie de la condition 5. L'autre partie est la relecture d'un échantillon par le référent (D2).

## D. Référents et contenus

| # | Quoi | Commandes, documents | Bloque | Durée |
|---|---|---|---|---|
| D1 | **Recruter les référents** : Maths 3e d'abord, puis Sciences et Français. Leur transmettre le [guide du référent](pilote/guide-referent.md) | Invitation : `/administration` → « Inviter un référent » ; cocher la famille, noter le code (affiché une seule fois), le transmettre par un canal sûr | Condition 3 | Variable (le plus long) |
| D2 | **Faire valider les contenus du pilote** : 3 à 5 chapitres (programme confronté à celui de l'IPN, liens de prérequis, scripts, quiz) ; relecture d'un échantillon des essais réels | Espace référent ; outil Conformité pour les documents officiels | Condition 4 | 2 à 4 semaines |
| D3 | **Vidéos** (facultatif pour le pilote) : choisir un fournisseur d'avatar synthétique, faire écrire sa passerelle ([dossier de production](production/README.md) §3 bis), fixer le budget par vidéo. Sans vidéo, les élèves lisent la **leçon écrite** tirée du script validé | `MODE_VIDEO=reel`, `BUDGET_VIDEO_USD` | — | 1 à 2 semaines |

## E. Technique

| # | Quoi | Commandes, documents | Coût | Durée |
|---|---|---|---|---|
| E1 | **Choisir et souscrire** : <br>• hébergement (Vercel ou Cloudflare) ; <br>• Supabase (région décidée avec le juriste) ; <br>• SMS (Twilio, puis un agrégateur local) ; <br>• email (Brevo) | [Dossier de production](production/README.md) §1 ; [comparatif des fournisseurs](fournisseurs-2026-10.md) | Budget de la condition 11 | 1 jour |
| E2 | **Configurer et déployer** : <br>• variables d'environnement d'après `secrets/commun.env.example` ; <br>• `SECRET_SESSION`, `SEL_AUDIT` et **`SEL_OPPOSITION`** : 32 caractères aléatoires au moins, ce dernier fixé une fois pour toutes ; <br>• API de données de Supabase fermée ; <br>• migrations, puis import du pack ; <br>• création de votre compte d'administration | `pnpm pack:sql ../referentiels/gabon > import.sql` ; `pnpm verifier:production`, qui doit finir par « Configuration complète » ; dossier de production §2 et §3 | — | 1 à 2 jours |
| E3 | **Essais réels** : <br>• un SMS et un email vers l'équipe ; <br>• une alerte de veille reçue sur un vrai téléphone ; <br>• l'exécuteur planifié toutes les 5 minutes ; <br>• la surveillance de `/api/sante` ; <br>• une sauvegarde et un test de restauration | Dossier de production §4 et §5 | Quelques USD | 1 jour |

E1 à E3 couvrent les conditions 6, 7 et 8.

## F. Établissement et équipe de veille

| # | Quoi | Documents | Bloque |
|---|---|---|---|
| F1 | **Accord de l'établissement**, et de l'autorité académique si le juriste l'exige | Convention ; [procédure du pilote](pilote/procedure.md) | Condition 2 |
| F2 | **Équipe de veille** nommée, avec les contacts d'urgence locaux ; `CONTACTS_VEILLE` renseigné sur le serveur | [Procédure de détresse](pilote/procedure-detresse.md) | Condition 9 |
| F2 bis | **Classe du pilote** : créer la classe et l'invitation de son enseignant (après l'avis du juriste, Q19) ; transmettre à l'enseignant son code personnel et le code de classe pour ses élèves | `/administration` → « Classes du pilote » ; noter les deux codes (affichés une seule fois) ; l'enseignant active son accès sur `/enseignant/activer` | — |
| F3 | **Information des familles** : fiche d'information et formulaire de participation, mis à jour après l'avis du juriste | [Fiche](pilote/fiche-information.md), [consentements](pilote/consentements.md) | — |
| F4 | **Budget du pilote** écrit (modèles, SMS, hébergement, vidéo) et plafond par agent et par jour (`COUT_JOUR_MAX_AGENT_USD`) | [Bilan du Jalon 8](bilans/jalon-8.md), §4 | Condition 11 |

## G. Répétition, puis décision

| # | Quoi | Document |
|---|---|---|
| G1 | **Répétition réelle** sur le site déployé, avec les numéros de l'équipe, en 12 lignes ; toute ligne en échec est corrigée et refaite | [Répétition](pilote/repetition.md) |
| G2 | **Décision de démarrer** : les 12 conditions cochées, chacune avec sa preuve | [Conditions du pilote](pilote/README.md) |

## H. Pendant et après le pilote

- **Chaque jour** : file humaine dans `/administration` (la détresse d'abord), coûts sur `/administration/exploitation`.
- **Chaque semaine** : indicateurs agrégés, questionnaire activé si vous l'avez validé, point avec le référent.
- **Purge** : quotidienne, seulement après que le juriste a fixé les durées. D'abord une semaine de simulation (`pnpm donnees:purger`), puis `pnpm donnees:purger --confirmer`.
- **Arrêt** : selon les [critères d'arrêt](pilote/criteres-arret.md) ; en cas d'incident, dossier de production §7 et §8.
- **Bilan** : [protocole de retour d'expérience](pilote/retour-experience.md), puis un rapport dans `docs/bilans/`.

## Ce que Claude Code peut faire pour vous, à chaque étape

| Étape | Aide possible |
|---|---|
| A2, B2 | Mettre à jour le pack, les textes et `SOURCES.md` d'après vos décisions ou l'avis du juriste |
| C2, C3 | Lancer les essais (après votre accord sur chaque coût), lire les rapports, corriger skills, entrées et contrôles |
| D1 | Préparer les invitations ; avec l'avis du juriste, faire préparer par le Recruteur les messages que vous approuverez |
| D2 | Intégrer les programmes officiels fournis par le référent, et vérifier les écarts avec l'outil Conformité |
| E2 | Relire la configuration avec vous, sans jamais voir une valeur (`pnpm verifier:production`) ; écrire une migration corrective si besoin |
| G1 | Préparer le compte rendu de répétition et corriger les écarts constatés |

**Ce que Claude Code ne fera jamais sans votre accord explicite** : déployer, souscrire un service, dépenser, lire ou recevoir un secret, utiliser des données réelles d'élèves, réécrire un prompt d'agent.
