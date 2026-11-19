# Bilan du Jalon 11

**Date** : 2026-10-28 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; agents, messagerie et vidéo **simulés** (aucune clé API, aucun fournisseur branché) ; rien n'est déployé ni souscrit ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0069) : lever les derniers obstacles techniques avant le pilote. Il s'agissait des premières semaines du référent, de la sauvegarde et de la restauration, et de la vérification d'un site déployé.

| Étape du plan | État | Remarque |
|---|---|---|
| 1. Accueil du premier référent | **Fait** | Chapitres du pilote choisis dans l'administration, en tête de l'espace du référent avec la prochaine action ; page d'accueil et encadré de bienvenue (ADR 0070). |
| 2. Files d'approbation | **Fait, autrement que prévu ; skill à valider** | L'Orchestrateur est programmé, pas un modèle : la priorité est devenue une règle (pilote en tête de chaque file). La skill va au Coordinateur (ADR 0071). |
| 3. Sauvegarde et restauration essayées | **Fait** | `pnpm base:sauvegarder` et `pnpm base:restaurer`. L'essai automatique sur deux Postgres jetables tourne dans l'intégration continue (ADR 0072). |
| 4. Vérification d'un site déployé | **Fait** | `pnpm verifier:site`, en lecture seule, avec 20 contrôles (ADR 0073). |
| 5. Passages réels des agents | **En attente** | Clé API, relecture des deux skills, accord sur le coût (~121 USD). |
| 6. Démonstration et bilan | **Fait** | 5 captures ; ce document. |

**Le Jalon 11 sera clos** quand les passages réels auront atteint les seuils (étape 5).

## 2. Défauts trouvés en cours de route (tous corrigés)

- **Liste des quiz à relire** : la nouvelle priorité « pilote » utilisait un alias de colonne dans un tri, ce que Postgres refuse. L'espace référent ne s'affichait plus. Les tests de bout en bout l'ont trouvé avant la livraison.
- **Captures** :
  - la page d'accueil était capturée avant d'être chargée, d'où une image très haute et presque vide ;
  - la file « À valider » n'était pas visible à l'écran ;
  - un guillemet « » » restait seul en début de ligne : il est maintenant lié au mot par une espace insécable.
- **Choix de conception** : une redirection obligatoire vers l'accueil aurait bloqué le référent à chaque activation. Un encadré « Bienvenue », que l'on peut fermer, l'a remplacée.

## 3. Démonstration (captures sur téléphone, données et agents simulés)

Index et commande de régénération : [`docs/demo/jalon-11/README.md`](../demo/jalon-11/README.md).

| | Écran |
|---|---|
| 01 | [Chapitres du pilote dans l'administration](../demo/jalon-11/01-administration-chapitres-du-pilote.png) |
| 02 | [Première visite du référent](../demo/jalon-11/02-referent-premiere-visite.png) |
| 03 | [Accueil du référent](../demo/jalon-11/03-referent-accueil.png) |
| 04 | [Prochaine action par chapitre du pilote](../demo/jalon-11/04-referent-chapitres-du-pilote-prochaine-action.png) |
| 05 | [File « À valider », pilote en tête](../demo/jalon-11/05-referent-file-a-valider-pilote-en-tete.png) |

## 4. Ce que vérifient les tests

| Série | Nombre | Commande |
|---|---|---|
| Tests unitaires (dont prochaine action, ordre pilote d'abord, vérification d'un site fictif) | 255, tous passés | `pnpm test` |
| Base de données (dont CP01 à CP04) | 125 scénarios, tous passés | `pnpm test:base` |
| Sauvegarde et restauration (S01 à S04, deux Postgres jetables) | Réussi | `pnpm test:sauvegarde` |
| Bout en bout sur téléphone simulé (dont accueil et chapitres du pilote, avec audit d'accessibilité) | 99, tous passés | `pnpm test:e2e` |
| Agents, mécanique sans coût | FA-01 et FA-02 conformes. Non conformes connus de la simulation, inchangés : Professeur TC-02, TC-09, TC-10, PR-03, PR-06 ; Évaluateur EV-02 à EV-04, EF-01, EF-02 ; Coordinateur CM-02, CM-12, CM-16 | `pnpm test:agents [--agent …]` |

## 5. Coûts

| Poste | Estimation | Statut |
|---|---|---|
| Passages réels complets de toutes les batteries | ~121 USD | Non lancés : clé, relecture des skills et accord attendus |
| Dépenses du jalon | 0 USD ; aucune dépendance ajoutée | — |

## 6. Décisions et actions attendues du propriétaire

Les attentes des bilans précédents restent ouvertes : juriste (dont Q19), clé API, référents, fournisseurs. S'y ajoutent :
1. **Relire les deux skills** avant les passages réels :
   - « élèves mineurs » (`agents/_commun/skills/eleves-mineurs/SKILL.md`) ;
   - « files d'approbation » (`agents/coordinateur/skills/files-d-approbation/SKILL.md`).
2. **Désigner les chapitres du pilote** dans `/administration` → « Chapitres du pilote », dès que le cadre du pilote est fixé (guide de mise en route, A4).
3. **Après le premier déploiement** :
   - `pnpm verifier:site https://<adresse>`, qui doit finir par « Site conforme » ;
   - un premier essai de restauration de la vraie base, à noter dans le tableau du dossier de production (§5) ;
   - choisir l'outil de chiffrement des copies de secours.
4. **Avec le premier référent** : ajuster les temps indicatifs de la page d'accueil.
