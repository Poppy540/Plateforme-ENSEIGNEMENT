# Plan du Jalon 24 — revue de sécurité des Jalons 16 à 23

**Statut** : validé par le propriétaire le 2026-11-12 (piste choisie, ADR 0119). Rien n'est commencé.

**Objectif** : la dernière revue de sécurité date du Jalon 16 (`docs/securite/revue-jalon-16.md`, migrations 0034 à 0046). Depuis, les Jalons 16 à 23 ont ajouté :

- **4 migrations** (0047 à 0050) : capacité des classes, chapitre « commencé », mot du pays pour les séries, `mes_classes()` redéfinie ;
- **le hors ligne étendu** : service worker, copies gardées 7 jours sur le téléphone, effacement à la déconnexion ;
- **des pages et actions** : capacité de classe, « Ce qui vous attend », tableau de bord lisant le jour en base ;
- **des scripts d'exploitation** :
  - `base:fuseau` (modifie la base) ;
  - `verifier:production` (lit désormais la base) ;
  - `paquet --pays` ;
  - `pack:nouveau` (écrit dans le dépôt) ;
  - `pack:verifier` ;
  - `verifier:liens` ;
  - `entrainement:referent` et `charge` (lisent la base) ;
- **la chaîne d'intégration** : GitHub Actions, CodeQL, Dependabot, audit des dépendances.

Le Jalon 24 relit tout cela **avant d'accueillir de vrais élèves mineurs**, corrige ce qui doit l'être, chaque fois avec un test, et renforce les garde-fous automatiques. **Rien n'est déployé ni souscrit.**

**Principes inchangés** :

- données fictives seulement ;
- aucun secret lu ni affiché ;
- aucun prompt d'agent modifié ;
- une correction qui change le comportement visible ou une règle du pilote passe par le propriétaire.

## Étapes (dans cet ordre)

| #   | Étape                     | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Besoin du propriétaire           |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 0   | Plan                      | Ce plan, l'ADR 0119 et `memory.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Validation (faite)               |
| 1   | Revue                     | Relecture consignée dans `docs/securite/revue-jalon-24.md`, sur la grille des Jalons 5 et 16. **Base** : migrations 0047 à 0050 (rôle vérifié en premier, `search_path`, droits d'exécution, fonctions redéfinies). **Application** : actions et pages nouvelles ou modifiées (accès, entrées, messages d'erreur sans fuite). **Téléphone** : ce que le service worker garde, pour qui, combien de temps, et ce qui est effacé. **Scripts** : quelles bases ils acceptent, ce qu'ils écrivent, ce qu'ils affichent (aucune valeur secrète). **Dépôt public** : flux GitHub, droits des actions, contenu publié (aucune donnée réelle, aucun secret dans l'historique). Chaque constat est classé : critique, élevé, moyen, faible, information. | —                                |
| 2   | Corrections et garde-fous | Les constats sans décision sont corrigés, chacun avec un test. Les garde-fous automatiques sont étendus là où la revue montre un trou (par exemple, un script d'écriture qui accepterait une base distante sans le dire).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | —                                |
| 3   | Décisions du propriétaire | Les constats qui touchent une règle, un comportement visible ou un coût sont présentés avec leurs choix et une recommandation (décisions D17 et suivantes), puis appliqués après réponse.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Réponses aux décisions           |
| 4   | Passages réels des agents | Repris des jalons précédents : dès que la clé, la relecture des skills et l'accord sont là.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Clé API ; accord sur chaque coût |
| 5   | Bilan                     | Bilan comme aux jalons précédents ; le dossier pour le juriste et la liste d'attentes sont mis à jour si la revue le demande.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | —                                |

L'étape 4 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-11-12)

1. **Piste retenue** : revue de sécurité des Jalons 16 à 23.
2. **Écartés pour ce jalon** :
   - la fusion dans `main` (possible à tout moment, sur demande) ;
   - l'heure du pays partout ;
   - la pause.

## Hors Jalon 24

- Un test d'intrusion par un tiers : après le déploiement, avec l'accord du propriétaire sur le coût.
