# Bilan du Jalon 6

**Date** : 2026-10-21 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; modèles et messagerie **simulés** (aucune clé API, aucun fournisseur SMS ou email branché) ; rien n'est déployé ni souscrit ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0048) : rendre la plateforme prête pour le pilote, pour tout ce qui ne dépend pas de vous. Cinq chantiers : décisions de sécurité, deuxième famille de matières, leçons lisibles sans vidéo, mesures pour le bilan, répétition du pilote.

| Étape du plan | État | Remarque |
|---|---|---|
| 1. Décisions D1 à D9 de la revue de sécurité | **Fait** | Sessions révocables et plus courtes pour les rôles sensibles ; politique de contenu à nonce ; sel secret de la liste d'opposition ; indicatifs du pack ; référents limités à leurs familles ; suppression des documents ; export pour l'équipe ; contrôle de l'API de données. D2 et D3 sont prêtes, mais sans effacement tant que le juriste n'a pas fixé les durées (ADR 0049). |
| 2. Passages réels des agents | **En attente** | Clé API et accord sur le coût ; mini-essais d'abord. |
| 3. Sciences 3e | **Fait, provisoire** | SVT (5 chapitres) et Physique-Chimie (4 chapitres) ; 15 liens, dont 6 vers les Mathématiques. Un lien entre familles est décidé par le référent du chapitre qui dépend : c'est votre décision (ADR 0050). |
| 4. Leçons écrites | **Fait** | Texte du script validé et inchangé, sans les notes au référent. Ouverte quand la vidéo manque, lisible hors ligne (ADR 0051). |
| 5. Mesures du pilote | **Fait ; questions à valider** | Compteur de lecture par chapitre, sans élève. Questionnaire anonyme à réponses fermées, inactif tant que vous ne l'avez pas validé (ADR 0052). |
| 6. Préparation du pilote | **Fait** | Point sur les 12 conditions (aucune remplie) ; répétition automatique de bout en bout ; déroulé de la répétition réelle ; guide du référent (`docs/pilote/`). |
| 7. Tests, démonstration, bilan | **Fait** | 7 captures ; ce document. |

**Le Jalon 6 sera clos** quand :
- les passages réels des batteries auront atteint les seuils (étape 2) ;
- les questions du questionnaire auront été validées.

## 2. Défauts trouvés en cours de route (tous corrigés)

- **Liens entre familles** : l'ancienne règle (référent des deux familles) rendait impossible tout lien Sciences ← Mathématiques. La nouvelle règle est votre décision (ADR 0050).
- **Questionnaire** : le message de remerciement disparaissait après l'envoi, la page étant rechargée sans questionnaire. La page n'est plus rechargée.
- **Tests fragiles** (sans effet sur la plateforme) : deux tests lisaient l'état d'une page trop tôt, ou visaient une détresse laissée par un autre test. Ils attendent maintenant la bonne page et visent leur propre signalement.
- **Sessions** : les cookies antérieurs au Jalon 6 ne sont plus acceptés. Chacun se reconnecte une fois ; c'est voulu (révocation en base).

## 3. Démonstration (captures sur téléphone, données et agents simulés)

Index et commande de régénération : [`docs/demo/jalon-6/README.md`](../demo/jalon-6/README.md).

| | Écran |
|---|---|
| 01 | [Connexion : indicatif non autorisé](../demo/jalon-6/01-connexion-indicatif-non-autorise.png) |
| 02 | [Référent de Sciences : liens vers les Mathématiques](../demo/jalon-6/02-referent-sciences-lien-vers-les-maths.png) |
| 03 | [Élève : leçon écrite sans vidéo](../demo/jalon-6/03-eleve-lecon-ecrite-sans-video.png) |
| 04 | [Élève : questionnaire anonyme](../demo/jalon-6/04-eleve-questionnaire-anonyme.png) |
| 05 | [Mes données : tous mes appareils](../demo/jalon-6/05-mes-donnees-tous-mes-appareils.png) |
| 06 | [Administration : documents et sessions](../demo/jalon-6/06-administration-documents-et-sessions.png) |
| 07 | [Pilotage : mesures du pilote](../demo/jalon-6/07-administration-mesures-du-pilote.png) |

## 4. Ce que vérifient les tests

| Série | Nombre | Commande |
|---|---|---|
| Tests unitaires (dont politique de contenu, indicatifs, sessions, leçons, mesures, Sciences 3e) | 217 | `pnpm test` |
| Base de données (jalons 1 à 5, plus D01-D07, M01-M03, B01-B03, Q01-Q04) | 111 scénarios | `pnpm test:base` |
| Bout en bout sur téléphone simulé (dont décisions de sécurité, Sciences 3e, leçon hors ligne, mesures, répétition du pilote) | 77 | `pnpm test:e2e` |
| Agents, mécanique sans coût | Inchangés : conformes sauf les scénarios non conformes connus en simulation (Professeur TC-02, TC-09, TC-10, PR-03, PR-06 ; Évaluateur EV-02 à EV-04 ; Coordinateur CM-02, CM-12, CM-16) | `pnpm test:agents [--agent …]` |

## 5. Coûts

| Poste | Estimation | Statut |
|---|---|---|
| Passages réels complets de toutes les batteries (5 exécutions par scénario) | ~105,4 USD | Non lancés : clé et accord attendus |
| Fonctionnement | Plafond par agent et par jour (`COUT_JOUR_MAX_AGENT_USD`, 50 USD par défaut) ; les leçons écrites et les mesures n'appellent aucun modèle | Budget du pilote à approuver |

## 6. Décisions et actions attendues du propriétaire

1. **Questionnaire anonyme** (`referentiels/gabon/questionnaire.yaml`) : valider ou corriger les 9 questions.
2. **Clé API** (dans l'environnement, jamais dans la conversation) et accord sur le coût des mini-essais, puis des passages complets.
3. **`SEL_OPPOSITION`** en production : 32 caractères aléatoires au moins, fixés une fois pour toutes.
4. **Juriste** : avis sur le dossier du pilote, durées de conservation (D3) et sort des résumés après suppression d'un compte (D2), mention d'information du questionnaire.
5. **Référents** : Maths (programmes du collège et du lycée, 70 liens) et Sciences (programmes IPN, 15 liens), avec le [guide du référent](../pilote/guide-referent.md).
6. **Fournisseurs et hébergement**, puis la [répétition réelle](../pilote/repetition.md) sur le site déployé : conditions 6 à 9 et 12 du pilote.
