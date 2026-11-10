# Bilan du Jalon 22

**Dates** : 2026-11-09 au 2026-11-10 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement (pays fictifs Z et Q, numéros `+999`) ; rien n'est déployé ni souscrit.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0110) : en attendant le curriculum de Mathématiques 3e (Jalon 21), vérifier que **tout** ce qui a été construit depuis le Jalon 4 marche encore pour un autre pays. Il s'agissait aussi de faire d'« Ajouter un pays » une procédure guidée et contrôlée.

| Étape du plan                    | État           | Remarque                                                                                                                               |
| -------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Inventaire                    | **Faite**      | 9 écarts corrigés, 5 consignés ; le mot « série » vient désormais du pack ; test de garde étendu (ADR 0111).                           |
| 2. Journée d'ouverture du pays Z | **Faite**      | Rejouée de bout en bout, étanchéité vérifiée dans les deux sens ; un vrai défaut trouvé et corrigé (ADR 0112).                         |
| 3. « Ajouter un pays » guidé     | **Faite**      | Modèle complet, gabarits, `pnpm pack:nouveau`, `pnpm pack:verifier`, guide en 10 étapes (ADR 0113).                                    |
| 4. Paquet par pays               | **Faite**      | Un déploiement, un pays : `pnpm base:fuseau`, la base seule horloge du jour, `pnpm paquet --pays`, contrôles de production (ADR 0114). |
| 5. Passages réels des agents     | **En attente** | Clé API, relecture des deux skills, accord sur le coût (~121 USD).                                                                     |
| 6. Bilan                         | **Fait**       | Ce document et 7 captures ([`docs/demo/jalon-22/`](../demo/jalon-22/README.md)).                                                       |

## 2. Ce qui a changé

- **Le vocabulaire du pays vient de son pack.** Le mot qui désigne les séries (« série » au Gabon, « option » dans le pays Z) est désormais lu dans le pack : inscription, espace de l'élève, catalogue, classes de l'administration, enseignant. Le choix d'une série disparaît pour un pays qui n'en a pas. L'exemple de nom de classe est pris dans le pack. Le code ne cite plus « IPN », « 3e » ni « Terminale » ; le test de garde le vérifie, dossier `scripts/` compris.
- **L'import d'un pack refuse une matière qui a un programme sans les réglages de ses quatre agents.** Avant, le référent tombait sur une erreur du serveur en demandant un quiz.
- **Deux commandes pour un nouveau pays.** `pnpm pack:nouveau` crée le pack depuis un modèle désormais complet. `pnpm pack:verifier` dit ce qui est bloquant, à compléter ou à valider.
- **Un déploiement sert un pays.** `pnpm base:fuseau` règle l'horloge de la base sur le fuseau du pays : la journée des limites et des chiffres du pilote change à minuit, heure locale. Les pages du pilote lisent la date dans la base, et non plus en UTC. `pnpm paquet --pays gabon` n'embarque que ce pack. `pnpm verifier:production` contrôle le pays, l'absence de pack de test et le fuseau.

## 3. Constats

- **La portabilité tenait, à quelques écarts près.** La journée d'ouverture du pays Z (classe, enseignant, référent, 10 élèves, quiz, hors ligne, chiffres de l'enseignant) est passée sans code propre à ce pays, une fois l'étape 1 faite. Aucun compte d'un pays ne voit rien de l'autre.
- **Les défauts réels sont venus des packs et du modèle, pas du code.** Le pays Z n'avait les réglages d'agents que pour une classe. Le questionnaire vide du modèle bloquait l'import de tout pack neuf. Les contrôles ajoutés les attrapent désormais.
- **Un écart venait de moi** : au Jalon 21, j'avais écrit « Mathématiques 3e » et « IPN » dans le code des attentes. Le test de garde, étendu, l'interdit maintenant.
- **Deux tests se gênaient** : le contrôle complet l'a montré avant tout envoi définitif. Le premier envoi de l'étape 2 (`11102ad`) a dû échouer sur GitHub ; l'envoi suivant l'a corrigé.
- **Le rapport du Gabon** (`pnpm pack:verifier ../referentiels/gabon`) n'a aucun point bloquant ; il sert de liste de travail :
  - 55 matières sur 67 sans programme ;
  - 12 programmes à valider ;
  - âge de la majorité, 4 durées de conservation et budget hebdomadaire non fixés ;
  - FAQ, questionnaire et recrutement à relire ;
  - 7 données « manquant » et 40 « à valider » dans `SOURCES.md`.
- **Reste en UTC** : les heures affichées dans le journal de l'administration (les dates sont justes).

## 4. Ce que vérifient les tests

| Série               | Nombre                                                                                         | Commande          |
| ------------------- | ---------------------------------------------------------------------------------------------- | ----------------- |
| Tests unitaires     | 355, tous passés (dont pays fictif « qq » créé depuis le modèle, fuseau du déploiement)        | `pnpm test`       |
| Contrôle complet    | 10 / 10 réussis ; 128 tests de bout en bout, dont la journée du pays Z (6 tests)               | `pnpm controler`  |
| Répétition générale | Fuseau réglé puis inchangé, paquet d'un seul pays, pack de test refusé, configuration complète | `pnpm repetition` |
| GitHub Actions      | Vert sur les étapes 1, 3 et 4 (dernier envoi `58ac0bf`)                                        | —                 |

## 5. Coûts

| Poste                                           | Estimation                                       | Statut                                                    |
| ----------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| Passages réels complets de toutes les batteries | ~121 USD                                         | Non lancés : clé, relecture des skills et accord attendus |
| Dépenses du jalon                               | 0 USD ; aucun service, aucune dépendance ajoutée | —                                                         |

## 6. Décisions et actions attendues du propriétaire

**Rien de nouveau n'est bloquant.** Une question facultative : faut-il afficher les heures du journal de l'administration à l'heure du pays ? Aujourd'hui, elles sont en UTC.

Le plus urgent reste au même endroit, [`docs/attentes-proprietaire.md`](../attentes-proprietaire.md) :

- **la demande de curriculum** de Mathématiques 3e ([lettre](../pilote/demande-curriculum.md)), qui débloque les étapes 2 et 3 du Jalon 21 ;
- le juriste ;
- la clé API et l'accord sur le coût ;
- la relecture des deux skills ;
- le premier référent ;
- les réglages GitHub.
