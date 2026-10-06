# Bilan du Jalon 2

**Date** : 2026-10-06 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; agents et vidéo **simulés** (aucune clé API, aucun fournisseur vidéo) ; rien n'est déployé ni souscrit.

## 1. Objectif et résultat

Objectif (prompt maître §7) : chaîne Scénariste → validation humaine → Production vidéo → Évaluateur, et une seule vidéo complète pour mesurer le coût et la qualité.

| Étape du plan | État | Remarque |
|---|---|---|
| 1. Données et droits | **Fait** | Scripts, quiz, vidéos versionnés et figés (empreinte) ; validations tracées ; rôles par agent ; publication par un humain seulement (ADR 0021). |
| 2. Agent Scénariste | **Fait, modèle simulé** | Sortie structurée vérifiée (huit étapes minutées, [À VÉRIFIER], « à relire en priorité ») ; lancé par le référent (ADR 0022). |
| 3. Validation des scripts | **Fait** | Version lue, commentaire au rejet, confirmation des points signalés, révision en nouvelle version (ADR 0023). |
| 4. Agent Évaluateur | **Fait, modèle simulé** | Quiz brouillon, validation, une tentative notée, correction avec la méthode, contestation, statistiques anonymisées (ADR 0024). |
| 5. Production vidéo | **Fait, services simulés** | Chaîne programmée appliquant le prompt C2 : vérifications, droits voix/visage, budget bloquant, fidélité, sous-titres, faible débit, dépôt « à relire », journal des coûts (ADR 0020, 0025). |
| 6. Revue et publication | **Fait, vidéos simulées** | Revue avec confirmation de visionnage, publication distincte, lecteur faible débit côté élève (ADR 0026). |
| 7. Vidéo pilote « Théorème de Thalès » | **En attente** | Fournisseurs, budget par vidéo et relecteur à décider ; coût et qualité réels non mesurés. |
| 8. Tests et clôture | **Préparé** | Lanceur étendu au Scénariste et à l'Évaluateur ; batterie VP en tests automatiques ; ce bilan. |

**Le Jalon 2 sera clos** quand : (a) les passages réels des batteries SC et EV (et TC + PR du Jalon 1) auront atteint les seuils, avec un échantillon relu par un humain ; (b) la vidéo pilote aura été produite avec de vrais fournisseurs, son coût mesuré poste par poste et sa qualité relue par un référent.

## 2. Démonstration (captures sur téléphone, données et agents simulés)

Régénérables avec `cd application && pnpm demo:captures tests/demo/jalon-2.spec.ts`, puis `bash scripts/compresser-captures.sh ../docs/demo/jalon-2`. Les textes « (simulé) » viennent des agents simulés : ils montrent le parcours, pas la qualité réelle des contenus.

| | Écran |
|---|---|
| 01 | [Le référent fait rédiger un script (durée, consigne)](../demo/jalon-2/01-generation-script.png) |
| 02 | [Relecture du brouillon : [À VÉRIFIER] surlignés, décision](../demo/jalon-2/02-script-brouillon.png) |
| 03 | [Production vidéo lancée depuis le script validé, journal et coût](../demo/jalon-2/03-production-video.png) |
| 04 | [Revue de la vidéo : lecteur, rapport de production, anomalies](../demo/jalon-2/04-revue-video.png) |
| 05 | [Vidéo validée, publication confirmée (acte distinct)](../demo/jalon-2/05-publication-video.png) |
| 06 | [Tableau du référent : contenus à relire](../demo/jalon-2/06-tableau-referent.png) |
| 07 | [Quiz brouillon de l'Évaluateur : réponses, lectures des erreurs, erreurs déduites](../demo/jalon-2/07-quiz-brouillon.png) |
| 08 | [Élève : vidéo publiée, lecteur faible débit (240p, Mo/min)](../demo/jalon-2/08-eleve-video-faible-debit.png) |
| 09 | [Élève : quiz sans les réponses](../demo/jalon-2/09-eleve-quiz.png) |
| 10 | [Élève : correction avec la méthode, score enregistré une fois](../demo/jalon-2/10-eleve-correction.png) |
| 11 | [Élève : contestation réexaminée, score inchangé](../demo/jalon-2/11-eleve-contestation.png) |

## 3. Ce que vérifient les tests

| Série | Nombre | Commande |
|---|---|---|
| Tests unitaires (dont batterie VP de la chaîne vidéo, déterministe) | 86 | `pnpm test` |
| Base de données : accès, échanges, import, référents, conservation (Jalon 1) ; contenus C01-C07, Évaluateur V01-V04, production D01-D03, lecture L01-L02 (Jalon 2) | 44 scénarios | `pnpm test:base` |
| Bout en bout sur téléphone simulé | 33 | `pnpm test:e2e` |
| Agents, mécanique sans coût : Professeur (TC + PR), Scénariste (TC + SC), Évaluateur (TC + EV) | 24 + 16 + 18 scénarios × 5 | `pnpm test:agents [--agent scenariste\|evaluateur]` |

Garde-fous vérifiés automatiquement, entre autres :
- aucun agent ne valide ni ne publie ; la base impose le statut « brouillon » ou « à relire », calcule version et empreinte, refuse toute modification d'un contenu existant ;
- un contenu n'est validé que par un référent de sa famille, sur la version qu'il a lue, une seule fois ;
- la vidéo n'est produite que depuis la version exacte d'un script validé : un script altéré après validation est refusé, journalisé et signalé ;
- budget dépassé, échec répété d'un service ou écart de fidélité : arrêt après 3 tentatives au plus, et alerte ;
- voix ou visage d'une personne réelle : refus sans autorisation enregistrée et active ;
- l'élève ne voit jamais les réponses d'un quiz avant d'avoir répondu, n'a qu'une tentative notée, et son score ne change pas après une contestation ;
- statistiques d'erreurs agrégées seulement, à partir de 5 tentatives ;
- vidéo visible par les élèves seulement après publication, sur un chapitre validé ; rien n'est téléchargé avant la lecture.

Avec les modèles simulés, quelques scénarios d'agents sont volontairement non conformes (Professeur : TC-02, TC-09, TC-10, PR-03, PR-06 ; Évaluateur : EV-02, EV-03, EV-04) : la simulation est naïve et les contrôles automatiques le détectent. Seul un passage réel dira la qualité des agents.

## 4. Coûts

| Poste | Estimation | Statut |
|---|---|---|
| Passage réel complet des tests (5 exécutions par scénario) | Professeur ~9 USD · Scénariste ~25 USD · Évaluateur ~15 USD | Non lancé : clé et accord attendus |
| Mini-essais | ~0,18 USD (Professeur), ~0,33 USD (SC-01), ~0,37 USD (EV-01 + EV-03) | Non lancés |
| Un script de cours | ~0,30 USD (estimation) | Non mesuré |
| Une vidéo de 10 min (avatar de catalogue, ordre de grandeur public) | ~10 USD (jusqu'à ~48 USD en haute qualité) | Non mesuré, à revérifier (`docs/fournisseurs-2026-10.md`) |
| Diffusion | ~15 USD/mois pour 100 élèves × 10 vidéos | Estimation |

Le coût d'une vidéo simulée affiché dans les captures (0,57 USD pour 34 s) n'est qu'un ordre de grandeur calculé par la simulation.

## 5. Écarts et limites

| Point | Statut |
|---|---|
| Production vidéo en chaîne programmée plutôt qu'en agent conversationnel | Validé (ADR 0020) |
| Lancement des agents par le référent, production synchrone | Provisoire : une file de tâches (Orchestrateur, Jalon 3) sera nécessaire avec de vrais fournisseurs |
| Pas de banque d'exercices : erreurs d'élèves « déduites » dans les quiz | À constituer avec le référent |
| Seules les réponses courtes sont corrigées par l'Évaluateur | Exercices rédigés : plus tard |
| Synchronisation, volume, lisibilité de la vidéo non mesurés | Relecture humaine obligatoire en attendant un fournisseur |
| Édition directe d'un script par le référent | Non retenue pour l'instant (ADR 0023), à rediscuter avec les référents |
| Entrées de test SC et EV rédigées par Claude Code | **À relire** |
| Valeurs provisoires des agents Scénariste, Évaluateur et fiche d'avatar | **À valider** |
| Codes de famille affichés tels quels (« mathematiques ») dans l'espace référent | Cosmétique, à corriger |
| Message serveur intermittent « destination stream closed early » pendant les tests de bout en bout | Présent avant le Jalon 2, sans échec de test |

## 6. Décisions et actions attendues du propriétaire

1. **Clé API** (`ANTHROPIC_API_KEY`, dans les paramètres de l'environnement, jamais dans la conversation) et accord sur le coût : d'abord les mini-essais (< 1 USD au total), puis les passages complets.
2. **Fournisseurs vidéo** (avatar, voix, hébergement) et **budget par vidéo** : comparatif dans `docs/fournisseurs-2026-10.md` ; comptes créés et clés renseignées par vous dans `secrets/production-video.env`.
3. **Vidéo pilote** : relue par un vrai référent ou, à titre exceptionnel, par vous.
4. Relire et valider : entrées de test SC et EV ; valeurs provisoires des agents de l'unité pilote ; fiche d'avatar ; règles choisies (une tentative par quiz, deux contestations, statistiques dès 5 élèves, 3 brouillons par chapitre et par jour).
5. Toujours en attente du Jalon 1 : premier référent de Maths 3e, programmes officiels de l'IPN, juriste au Gabon (mineurs, données, droits à l'image et à la voix).
