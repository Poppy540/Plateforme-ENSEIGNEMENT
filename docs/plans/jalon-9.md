# Plan du Jalon 9 — prêt pour la première classe

**Statut** : validé par le propriétaire le 2026-10-26 (décisions ci-dessous, ADR 0061). Étape 1 faite (ADR 0062). Étape 2 faite (ADR 0063). Étape 3 faite (ADR 0064).

**Objectif** : préparer ce qui servira dès la première classe du pilote, en attendant la clé API, le juriste et les référents :
- une vue de suivi pour l'enseignant de la classe, en chiffres agrégés seulement ;
- la protection du texte des élèves envoyé au Professeur (question Q8 du juriste) ;
- des pages plus légères, pour qu'une instance du serveur tienne plus d'élèves.

**Principe inchangé** : tout est construit en simulation, avec des données fictives. Rien n'est déployé ni souscrit, et aucune dépense n'est faite sans l'accord du propriétaire. Aucun prompt d'agent n'est modifié.

## Étapes (dans cet ordre)

| # | Étape | Contenu | Besoin du propriétaire |
|---|---|---|---|
| 0 | Plan | Ce plan, l'ADR 0061 et `memory.md`. | Validation (faite) |
| 1 | Texte des élèves protégé avant le Professeur | Les numéros, emails, adresses et identifiants écrits par l'élève sont masqués avant l'envoi au modèle, comme pour le Support et le Recruteur. La détresse reste signalée. Les tests vérifient le masquage et la non-régression des scénarios du Professeur en simulation. Le dossier du juriste (Q8) est mis à jour. | — |
| 2 | Vue de l'enseignant de la classe | Nouveau public : l'enseignant de la classe pilote, invité par le propriétaire avec un code, comme un référent. Les élèves sont rattachés à une classe pilote (code de classe donné à l'inscription ou par l'administration). L'enseignant voit **seulement des chiffres agrégés** de sa classe : élèves actifs, avancement par chapitre, réussite moyenne aux quiz, notions les plus difficiles, masqués sous 5 élèves. Aucun nom, aucun message, aucune réponse individuelle. Règles d'accès en base, tests de base et de bout en bout, accessibilité. La fiche d'information des familles et le dossier du juriste sont mis à jour (nouveau traitement). | Avis du juriste avant usage réel |
| 3 | Pages plus légères | Mesure de ce qui coûte dans les pages les plus lourdes (chapitre, espace élève) ; mise en cache des données du pack qui ne changent pas, requêtes regroupées. Cible : au moins 1,5 fois plus de pages par seconde et par instance, mesurée avec `pnpm charge`. Seuils et réglages dans le dossier de production. | — |
| 4 | Passages réels des agents | Dès que la clé et l'accord sont là : mini-essais, puis séries complètes (~115 USD) après un nouvel accord. | Clé API ; accord sur chaque coût |
| 5 | Démonstration et bilan | Captures des écrans de l'enseignant ; bilan comme aux jalons précédents. | — |

L'étape 4 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-10-26)

1. **Ordre** : le pilote d'abord (vue de l'enseignant, protection du texte des élèves, pages plus légères).
2. **Vue de l'enseignant** : chiffres agrégés seulement, masqués sous 5 élèves ; aucune donnée individuelle tant que le juriste ne s'est pas prononcé.
3. **Masquage avant le Professeur** et **contenus** : pas de préférence exprimée. Claude Code retient les propositions recommandées : masquage fait (étape 1) ; aucune nouvelle matière. Le propriétaire peut revenir sur ces deux choix à tout moment.

## Hors Jalon 9

- Données individuelles d'élèves pour l'enseignant (après l'avis du juriste seulement).
- Nouvelle matière.
- WhatsApp.
- Paiements (pilote gratuit, ADR 0013).
- Mise en production et pilote réel.
- Skills propres au projet encore à écrire (mineurs, faible débit…) : à proposer dans un jalon suivant.
