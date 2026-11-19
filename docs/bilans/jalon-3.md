# Bilan du Jalon 3

**Date** : 2026-10-09 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; modèles et messagerie **simulés** (aucune clé API, aucun fournisseur SMS ou email) ; rien n'est déployé ni souscrit ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (prompt maître §7) : agents Tuteur, Support/inscription et Orchestrateur ; pilote avec une classe partenaire. Décisions du propriétaire (ADR 0027) : Orchestrateur en chaîne programmée, Support sur le site d'abord, rapports aux parents hebdomadaires et à la demande avec un accord séparé, rappels désactivés par défaut.

| Étape du plan | État | Remarque |
|---|---|---|
| 1. Données et droits | **Fait** | Préférences, recommandations, rapports, tickets, file de tâches, état des agents, journal d'audit pseudonymisé ; rôles `agent_tuteur`, `agent_support`, `agent_orchestrateur` limités au §5.2 (ADR 0028). |
| 2. Orchestrateur | **Fait** | Chaîne programmée : routage par règles, approbations vérifiées en base, détresse d'abord, limites de profondeur et de coût, suspension et alerte ; exécuteur planifié ; page `/administration` (ADR 0029). |
| 3. Agent Tuteur | **Fait, modèle simulé** | Remontée du graphe de prérequis sans modèle, ≤ 3 priorités choisies parmi des candidats, décrochage signalé ; page « Mon plan de révision » (ADR 0030). |
| 4. Rapports aux parents | **Fait, messagerie simulée** | Accord séparé par lien à usage unique, révocable par l'élève ou le parent ; envoi par un service qui seul voit le contact ; question du parent au Tuteur (ADR 0031). |
| 5. Agent Support | **Fait, modèle simulé** | Page `/aide` : FAQ du pack pays pour tous, assistant pour les personnes connectées ; jamais de code ni de mot de passe ; tickets et escalades ; détresse en priorité 1 (ADR 0032). |
| 6. Tests et démonstration | **Fait** | Lanceur étendu au Tuteur et au Support ; traitement de la file humaine par l'administration (ADR 0033) ; 9 captures. |
| 7. Pilote avec une classe partenaire | **Préparé (documents)** | `docs/pilote/` : 12 conditions préalables, procédure, fiche d'information, consentements, détresse, retour d'expérience, critères d'arrêt. Suspension effective des agents et interrupteur d'accès des élèves construits (ADR 0034). |
| 8. Bilan | **Fait** | Ce document. |

**Le Jalon 3 sera clos** quand : (a) les passages réels des batteries TU et SU (et des jalons précédents) auront atteint les seuils, avec un échantillon relu par un humain ; (b) le pilote aura eu lieu, une fois les 12 conditions de `docs/pilote/README.md` remplies, et son rapport aura été rédigé.

## 2. Démonstration (captures sur téléphone, données et agents simulés)

Index et commande de régénération : [`docs/demo/jalon-3/README.md`](../demo/jalon-3/README.md). Les textes « (simulé) » montrent le parcours, pas la qualité réelle des agents.

| | Écran |
|---|---|
| 01 | [Aide : questions fréquentes lisibles sans compte](../demo/jalon-3/01-aide-questions-frequentes.png) |
| 02 | [Élève : plan de révision (≤ 3 priorités), préférences, rappels désactivés](../demo/jalon-3/02-eleve-plan-de-revision.png) |
| 03 | [Parent : accord aux rapports par lien à usage unique](../demo/jalon-3/03-parent-accord-rapports.png) |
| 04 | [Messagerie simulée : invitation et rapport hebdomadaire](../demo/jalon-3/04-messagerie-simulee.png) |
| 05 | [Parent : rapport, question au Tuteur (refus de comparer), arrêt](../demo/jalon-3/05-parent-rapport-et-question.png) |
| 06 | [Support : code de connexion refusé](../demo/jalon-3/06-support-code-refuse.png) |
| 07 | [Support : remboursement transmis à un humain](../demo/jalon-3/07-support-escalade.png) |
| 08 | [Administration : file humaine, détresse en tête](../demo/jalon-3/08-administration-file-humaine.png) |
| 09 | [Administration : ticket pris en charge](../demo/jalon-3/09-administration-ticket-pris-en-charge.png) |

Les captures sont antérieures à l'interrupteur d'accès des élèves (ADR 0034), qui ajoute une section en haut de `/administration`.

## 3. Ce que vérifient les tests

| Série | Nombre | Commande |
|---|---|---|
| Tests unitaires (dont batteries OR et VP, déterministes) | 121 | `pnpm test` |
| Base de données : jalons 1 et 2, plus J01-J05, O01-O02, T301, RP01-RP04, F01-F02, A01-A02 | 59 scénarios | `pnpm test:base` |
| Bout en bout sur téléphone simulé | 42 | `pnpm test:e2e` |
| Agents, mécanique sans coût : Professeur (TC + PR), Scénariste (TC + SC), Évaluateur (TC + EV), Tuteur (TC + TU), Support (TC + SU) | 24 + 16 + 18 + 18 + 18 scénarios × 5 | `pnpm test:agents [--agent …]` |

Garde-fous du Jalon 3 vérifiés automatiquement, entre autres :
- l'Orchestrateur ne valide rien : il relit l'approbation en base à la demande **et** à l'exécution ; détresse en tête de file ; boucles coupées à la profondeur 3 ; agent suspendu au coût anormal ;
- le Tuteur ne choisit que parmi des chapitres calculés sans modèle, au plus trois, et ne compare jamais les élèves ;
- aucun rapport sans accord « rapports aux parents » enregistré et actif (refusé par la base) ; le Tuteur ne voit jamais le contact du parent ; un lien par rapport ;
- le Support ne cite que des entrées de FAQ existantes, masque codes et numéros de carte, escalade paiement, suppression, usurpation et détresse ; la conversation n'est pas conservée ;
- seule l'administration traite la file humaine, en son nom, sans réouverture ;
- un agent suspendu ne répond plus à personne ; l'accès des élèves peut être fermé avec un message neutre, « Mes données » restant accessible.

Avec les modèles simulés, Scénariste, Tuteur et Support sont conformes ; quelques scénarios restent volontairement non conformes (Professeur : TC-02, TC-09, TC-10, PR-03, PR-06 ; Évaluateur : EV-02, EV-03, EV-04), comme aux jalons précédents. Seul un passage réel dira la qualité des agents.

## 4. Coûts

| Poste | Estimation | Statut |
|---|---|---|
| Passage réel complet des tests (5 exécutions par scénario) | Professeur ~9,3 · Scénariste ~25,2 · Évaluateur ~15,1 · Tuteur ~7,7 · Support ~4,3 USD ; **~61,6 USD** en tout | Non lancé : clé et accord attendus |
| Mini-essais (1 exécution) | Tuteur TU-01 + TC-09 ~0,20 USD ; Support SU-02 + SU-03 + TC-09 ~0,17 USD ; plus ceux du Jalon 2 (~0,88 USD) | Non lancés |
| Fonctionnement | Plafond journalier par agent de l'Orchestrateur : `COUT_JOUR_MAX_AGENT_USD` (50 USD par défaut) ; quotas : 3 plans/jour, 20 questions d'aide/jour, 1 rapport à la demande/jour | Budget du pilote à approuver |

## 5. Écarts et limites

| Point | Statut |
|---|---|
| **Alerte de détresse** vers la personne de veille (SMS/email) | **À construire** avec le fournisseur choisi (condition préalable n° 8) |
| Messagerie simulée (`/developpement/messages`) | Fournisseur SMS/email et modèles de messages à approuver |
| Support sur le site seulement | WhatsApp Business plus tard (fournisseur, coûts, modèles approuvés) |
| Réponse écrite au demandeur d'un ticket | Pas encore : passera par la messagerie réelle |
| Quota de questions d'aide en mémoire du serveur | À reprendre en base avant un déploiement à plusieurs instances |
| Visionnage des vidéos non mesuré | Compteur agrégé à ajouter si souhaité (retour d'expérience) |
| Rappels à l'élève | Préférence enregistrée, aucun envoi (désactivés par défaut, pas de messagerie réelle) |
| Contrôles de suspension faits par le serveur | La base limite toujours chaque agent à son périmètre (ADR 0034) |
| FAQ du Support, délai de réponse aux tickets, entrées de test TU et SU, valeurs des agents | **À valider** |
| Dossier du pilote | **À relire** par vous puis par le juriste ; contacts d'urgence à compléter |
| Codes de famille affichés tels quels dans l'espace référent | Cosmétique, toujours à corriger |
| Message serveur intermittent « destination stream closed early » en bout en bout | Sans échec de test, présent depuis le Jalon 2 |

## 6. Décisions et actions attendues du propriétaire

1. **Clé API** (`ANTHROPIC_API_KEY`, dans les paramètres de l'environnement, jamais dans la conversation) et accord sur le coût : mini-essais d'abord (~1,25 USD au total), puis passages complets (~61,6 USD).
2. **Fournisseur SMS/email** (codes de connexion, messages aux parents, alerte de détresse) et modèles de messages ; **hébergement**.
3. **Dossier du pilote** (`docs/pilote/`) : relecture, transmission au juriste au Gabon, équipe de veille et contacts d'urgence, établissement partenaire, budget.
4. Relire et valider : FAQ et délai des tickets, entrées de test TU et SU, valeurs provisoires des agents, fréquences de veille et délais de la procédure de détresse.
5. Toujours en attente des jalons précédents : premier référent de Maths 3e, programmes officiels de l'IPN, fournisseurs vidéo et budget par vidéo, vidéo pilote.
