# Bilan du Jalon 4

**Date** : 2026-10-20 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; modèles et messagerie **simulés** (aucune clé API, aucun fournisseur SMS ou email) ; rien n'est déployé ni souscrit ; **aucun élève, parent ou candidat réel**.

## 1. Objectif et résultat

Objectif (prompt maître §7, point 5) : « autres unités, Coordinateurs de famille, Recruteur, second pays ». Décisions du propriétaire (ADR 0035) :
- ordre : Coordinateur, puis Conformité, puis Recruteur ;
- première famille : Mathématiques au collège, de la 6e à la 3e ;
- second pays : un pack fictif seulement ;
- alerte de veille construite avec un envoi simulé.

| Étape du plan | État | Remarque |
|---|---|---|
| 0. Reliquats du pilote | **Fait, envoi simulé** | Alerte de veille sur toute priorité 1, sans donnée d'élève, avec relance ; quota d'aide tenu en base ; libellés des familles (ADR 0036). |
| 1. Famille Mathématiques 6e-3e | **Fait, programmes provisoires** | Programmes 6e, 5e et 4e repris du cadrage ; graphe de prérequis entre classes (44 liens proposés), validé lien par lien par le référent ; Tuteur sur plusieurs classes (ADR 0037). |
| 2. Agent Coordinateur | **Fait, modèle simulé** | Revue de cohérence par l'Orchestrateur, rapport brouillon ; le référent accepte ou écarte chaque lien et le glossaire ; statistiques agrégées seulement (ADR 0038). |
| 3. Agent Conformité programme | **Fait, modèle simulé** | Dépôt d'un document (texte ou PDF) ; extraction sourcée, rapport d'écart, brouillon YAML du pack ; il n'écrit jamais dans le référentiel (ADR 0039). |
| 4. Agent Recruteur | **Fait, modèle et envoi simulés** | Fiches minimales, approbation par empreinte, envoi contrôlé par la base, liste d'opposition, une seule relance, suppression (ADR 0040). |
| 5. Second pays (pack fictif `zz`) | **Fait** | Importé à côté du pilote sans code propre à un pays ; quatre défauts de portabilité corrigés de façon générique (ADR 0041). |
| 6. Tests, démonstration, bilan | **Fait** | Lanceur étendu aux trois nouveaux agents ; 9 captures ; ce document. |

**Le Jalon 4 sera clos** quand :
- (a) les passages réels des batteries CM, CO et RC auront atteint les seuils, avec un échantillon relu par un humain ;
- (b) un référent de Maths aura validé les programmes 6e-3e et le graphe de prérequis ;
- (c) le juriste aura rendu son avis sur le Recruteur avant tout usage réel.

## 2. Démonstration (captures sur téléphone, données et agents simulés)

Index et commande de régénération : [`docs/demo/jalon-4/README.md`](../demo/jalon-4/README.md). Les textes « (simulé) » montrent le parcours, pas la qualité réelle des agents.

| | Écran |
|---|---|
| 01 | [Référent : graphe de prérequis entre classes](../demo/jalon-4/01-referent-graphe-prerequis.png) |
| 02 | [Coordinateur : revue de cohérence (brouillon)](../demo/jalon-4/02-coordinateur-revue-de-coherence.png) |
| 03 | [Conformité : rapport d'écart d'un document fictif](../demo/jalon-4/03-conformite-rapport-d-ecart.png) |
| 04 | [Recruteur : premier message en attente d'approbation](../demo/jalon-4/04-recrutement-brouillon-a-approuver.png) |
| 05 | [Messagerie simulée : premier message envoyé](../demo/jalon-4/05-messagerie-simulee-premier-contact.png) |
| 06 | [Recruteur : refus, opposition, plus aucun contact](../demo/jalon-4/06-recrutement-refus-et-opposition.png) |
| 07 | [Pays fictif Z : aide de son pack](../demo/jalon-4/07-pays-z-aide.png) |
| 08 | [Pays fictif Z : inscription (classes, options, majorité)](../demo/jalon-4/08-pays-z-inscription.png) |
| 09 | [Pays fictif Z : catalogue](../demo/jalon-4/09-pays-z-catalogue.png) |

## 3. Ce que vérifient les tests

| Série | Nombre | Commande |
|---|---|---|
| Tests unitaires (dont batteries OR et VP, déterministes) | 172 | `pnpm test` |
| Base de données (jalons 1 à 3, plus W, G, K, Z, N et Y) | 85 scénarios | `pnpm test:base` |
| Bout en bout sur téléphone simulé | 55 | `pnpm test:e2e` |
| Agents, mécanique sans coût | Professeur 24, Scénariste 16, Évaluateur 18, Tuteur 18, Support 18, **Coordinateur 25, Conformité 16, Recruteur 27** scénarios × 5 | `pnpm test:agents [--agent …]` |

Garde-fous du Jalon 4 vérifiés automatiquement, entre autres :
- **Coordinateur** : aucune table d'élève ; statistiques seulement à partir de 5 tentatives ; propositions refusées par la base si elles créent un cycle ou un prérequis d'une classe supérieure ; rien n'est appliqué sans décision du référent.
- **Conformité** :
  - le document est une donnée, jamais une instruction ;
  - pas de donnée « officielle » sans source ou si le document n'a pas été déclaré officiel ;
  - aucune valeur inventée pour un champ manquant ;
  - aucune écriture dans le référentiel.
- **Recruteur** :
  - rien ne part sans approbation du texte exact, et un texte ne se modifie jamais ;
  - la liste d'opposition est vérifiée juste avant l'envoi ; un seul premier contact, une seule relance après le délai ;
  - l'agent ne voit pas le contact et ne peut ni approuver, ni envoyer, ni marquer un accord signé ;
  - la fiche reste minimale : ni donnée sensible, ni montant non validé, ni pression, ni promesse, ni clause sur la voix ou l'image.
- **Portabilité** :
  - le pack de test est refusé à l'import sans `--test` ;
  - aucun lien, aucune série, aucune validation ni lecture d'agent ne traverse les pays ;
  - aucune valeur d'un pays n'entre dans les prompts de l'autre.

Avec les modèles simulés, Scénariste, Tuteur, Support, Conformité et Recruteur sont conformes. Quelques scénarios restent non conformes, comme aux jalons précédents :
- Professeur : TC-02, TC-09, TC-10, PR-03, PR-06 ;
- Évaluateur : EV-02, EV-03, EV-04 ;
- Coordinateur : CM-02, CM-12, CM-16.

Les réponses simulées ne couvrent pas ces situations. Seul un passage réel dira la qualité des agents.

## 4. Coûts

| Poste | Estimation | Statut |
|---|---|---|
| Passage réel complet des nouveaux agents (5 exécutions par scénario) | Coordinateur ~22,5 · Conformité ~12,5 · Recruteur ~8,9 USD ; **~43,8 USD** | Non lancé : clé et accord attendus |
| Passage réel complet de tous les agents | **~105,4 USD** (dont ~61,6 pour les jalons précédents) | Non lancé |
| Fonctionnement | Plafond journalier par agent de l'Orchestrateur (`COUT_JOUR_MAX_AGENT_USD`, 50 USD par défaut) ; le Recruteur n'agit qu'à la demande du propriétaire | Budget à approuver |

## 5. Écarts et limites

| Point | Statut |
|---|---|
| Alerte de veille, messages aux candidats et aux parents | **Envoi simulé** : fournisseur SMS/email à choisir |
| Programmes 6e, 5e, 4e et graphe de prérequis | **Provisoires**, à valider par un référent de Maths ; volumes et coefficients manquants |
| Lecture des PDF par la Conformité | Seulement en passage réel (le modèle simulé ne lit pas un PDF) |
| Recruteur : agenda, recherche de candidats, rapport hebdomadaire | Pas construits : fournisseurs, puis avis du juriste |
| `recrutement.yaml` du Gabon | **À valider** ; conditions non fixées (l'agent n'en présente aucune) |
| Phrase « séries gabonaises ailleurs » du prompt Conformité | Reste dans le prompt de tous les pays (prompt du cadrage, non réécrit sans votre accord) |
| Batteries des agents | Écrites pour l'unité pilote ; un vrai second pays demandera ses propres entrées |
| Rapport d'écart de la Conformité sur téléphone | Tableaux larges, lisibles par défilement horizontal |

## 6. Décisions et actions attendues du propriétaire

1. **Clé API** (`ANTHROPIC_API_KEY`, dans les paramètres de l'environnement, jamais dans la conversation) et accord sur le coût : passages réels des nouveaux agents (~43,8 USD), ou de tous (~105,4 USD).
2. **Juriste** : avis sur le Recruteur (prospection, données des candidats, agents du secteur public) avant tout usage réel ; puis le dossier du pilote (`docs/pilote/`).
3. **Référent de Maths** : programmes 6e-3e, graphe de prérequis, programmes officiels de l'IPN.
4. **Fournisseurs** SMS/email (alerte de veille, parents, candidats), agenda, hébergement.
5. Relire et valider :
   - `recrutement.yaml` : sources, délai, modèles, FAQ, conditions à fixer ;
   - les valeurs provisoires des agents ;
   - les entrées de test CM, CO et RC.
6. **Phrase du prompt Conformité** : dire si l'exemple « séries gabonaises » peut être rendu neutre.
7. **Vrai second pays** : à choisir plus tard ; le pack fictif `zz` montre la marche à suivre (`referentiels/README.md`).
