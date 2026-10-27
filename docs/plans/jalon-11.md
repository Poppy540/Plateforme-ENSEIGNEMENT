# Plan du Jalon 11 — prêt à démarrer

**Statut** : validé par le propriétaire le 2026-10-28 (décisions ci-dessous, ADR 0069). **Rien n'est commencé.**

**Objectif** : lever trois derniers obstacles techniques avant le pilote :
- les premières semaines du référent, qui est le goulot du pilote ;
- la sauvegarde et la restauration, jamais essayées ;
- la vérification d'un site déployé.

**Principe inchangé** : tout est construit en simulation, avec des données fictives. Rien n'est déployé ni souscrit, et aucune dépense n'est faite sans l'accord du propriétaire. Aucun prompt d'agent n'est modifié.

## Étapes (dans cet ordre)

| # | Étape | Contenu | Besoin du propriétaire |
|---|---|---|---|
| 0 | Plan | Ce plan, l'ADR 0069 et `memory.md`. | Validation (faite) |
| 1 | Accueil du premier référent | À la première connexion du référent : une page d'accueil guidée (ce qu'on attend de lui, dans quel ordre, temps indicatif, lien vers le guide du référent). Elle reste ensuite accessible. Les chapitres du pilote, ceux que le propriétaire aura désignés, passent en tête de son espace, avec l'état de chacun : programme, liens de prérequis, script, quiz, vidéo ou leçon écrite, et la prochaine action. Choix des chapitres du pilote dans l'administration ; aucune valeur propre au Gabon dans le code. Tests de base et de bout en bout, accessibilité. | Choisir les chapitres du pilote (dans l'administration) |
| 2 | Skill « files d'approbation » | Skill de l'Orchestrateur et du Coordinateur : présenter au référent ce qui attend, par priorité (chapitres du pilote d'abord, détresse et erreurs signalées avant tout), sans jamais valider à sa place. Origine et statut « à valider » dans `SOURCES.md` ; batteries simulées relancées. | Relecture de la skill avant les passages réels |
| 3 | Sauvegarde et restauration essayées | Script `pnpm base:sauvegarder` / `pnpm base:restaurer`, qui refuse d'écraser une base non vide sans confirmation. Essai complet sur la base locale de données fictives : sauvegarder, effacer, restaurer, puis vérifier que les données, les rôles et les règles d'accès sont revenus (test automatisé). Procédure pas à pas et fréquence recommandée dans le dossier de production (§5), en plus des sauvegardes de l'hébergeur. | — |
| 4 | Vérification d'un site déployé | Commande `pnpm verifier:site <adresse>`, en lecture seule. Elle contrôle : https et en-têtes de sécurité, politique de contenu à nonce, `/api/sante`, page de connexion, absence de la simulation et des pages de développement, refus d'une API sans session, robots et cache. Rapport clair, sans aucune valeur secrète. Essayée en local contre un serveur de production simulé, avec des cas d'échec volontaires. Ajoutée au guide de mise en route (E3) et à la répétition du pilote. | — |
| 5 | Passages réels des agents | Dès que la clé, la relecture des skills et l'accord sont là : mini-essais, puis séries complètes (~119 USD, plus la nouvelle skill) après un nouvel accord. | Clé API ; accord sur chaque coût |
| 6 | Démonstration et bilan | Captures de l'accueil du référent et de son espace ; bilan comme aux jalons précédents. | — |

L'étape 5 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-10-28)

1. **Pistes retenues** : accueil du premier référent (avec la skill « files d'approbation »), sauvegarde et restauration essayées, vérification d'un site déployé.
2. **Écartées pour ce jalon** :
   - la skill « faible débit » ;
   - une nouvelle matière ;
   - WhatsApp et les paiements ;
   - la vue par élève pour l'enseignant, qui attend l'avis du juriste.

## Hors Jalon 11

- Skill « faible débit » (à proposer plus tard).
- Mise en production et pilote réel.
- Nouvelles matières, WhatsApp, paiements.
