# Plan du Jalon 8 — débloquer le réel

**Statut** : validé par le propriétaire le 2026-10-22 (décisions ci-dessous, ADR 0058). Étape 1 faite (`docs/juridique/dossier-juriste.md`).

**Objectif** : ce qui retarde le pilote ne dépend plus du code : clé API, juriste, référents, fournisseurs, hébergement. Ce jalon court prépare ces démarches (un dossier pour le juriste, un guide de mise en route pour le propriétaire). Il vérifie aussi ce qui ne l'a jamais été : la tenue de la plateforme quand beaucoup d'élèves l'utilisent en même temps.

**Principe inchangé** : tout est construit en simulation, avec des données fictives. Rien n'est déployé ni souscrit, et aucune dépense n'est faite sans l'accord du propriétaire. Aucun nouveau contenu dans ce jalon.

## Étapes (dans cet ordre)

| # | Étape | Contenu | Besoin du propriétaire |
|---|---|---|---|
| 0 | Plan | Ce plan, l'ADR 0058 et `memory.md`. | Validation (faite) |
| 1 | Dossier pour le juriste | Un seul document à transmettre : registre des traitements, analyse des risques pour les mineurs, questions précises. Le registre donne, pour chaque traitement, les données, la finalité, la durée de conservation, qui y accède, l'hébergement et les sous-traitants, l'IA hors du pays. Tout est tiré de ce qui est déjà en place, avec des renvois aux décisions. | Relecture, puis transmission au juriste |
| 2 | Guide de mise en route du propriétaire | De zéro au pilote, dans l'ordre : pour chaque étape, ce qu'il faut décider, qui contacter, les commandes à lancer, le temps estimé, ce qui la bloque. Il rassemble le dossier de production, les 12 conditions du pilote et les bilans. | — |
| 3 | Tenue en charge | 200 élèves fictifs simultanés sur la base locale (connexion, catalogue, chapitre, question au professeur simulé, quiz). Temps de réponse (médian, 95 %) et erreurs ; limites mesurées (connexions à la base, quotas). Corrections ; seuils et réglages dans le dossier de production. Script en Node, sans nouvelle dépendance. | — |
| 4 | Tests des agents pour le Français | Scénarios propres à la matière : refuser de rédiger à la place de l'élève, aucune citation ni auteur inventé, correction d'une réponse courte avec la méthode. Entrées fictives, contrôles automatiques, passage en simulation ; prêts pour un passage réel. Aucun prompt n'est modifié. | Relecture des scénarios par le référent de Français, plus tard |
| 5 | Passages réels des agents | Dès que la clé et l'accord sont là : mini-essais, puis séries complètes (~105 USD, plus le Français) après un nouvel accord. | Clé API ; accord sur chaque coût |
| 6 | Bilan | Comme aux jalons précédents (captures si un écran change). | — |

L'étape 5 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-10-22)

1. **Ordre** : débloquer le réel d'abord (dossier pour le juriste, guide de mise en route), puis la tenue en charge et les tests des agents pour le Français.
2. **Charge visée** : 200 élèves simultanés.
3. **Contenus** : aucun nouveau contenu ; les quatre matières déjà prêtes (Maths, SVT, Physique-Chimie, Français) attendent leurs référents.

## Hors Jalon 8

- WhatsApp.
- Paiements (pilote gratuit, ADR 0013).
- Mise en production.
- Pilote réel.
- Vrai second pays.
- Nouveaux contenus.
