# 0082 — Rapport hebdomadaire agrégé du pilote

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 13, étape 3).

## Contexte

Le protocole de retour d'expérience (`docs/pilote/retour-experience.md`) prévoit un point chaque semaine, autour de 5 questions : usage, aide, agents dans leur rôle, charge de l'équipe, coût.

Les indicateurs existent jour par jour (`/administration/exploitation`, ADR 0046). En revanche, rien ne donnait la synthèse d'une semaine comparée à la précédente. Il n'existait pas non plus de version présentable à l'établissement.

## Décision

1. **Page `/administration/semaine`** (lien « Semaine du pilote ») : un tableau par question, avec la semaine et la semaine précédente.
   - Par défaut, la semaine se termine aujourd'hui. On peut choisir le dernier jour : une date réelle, ni future, ni avant 2020 ; sinon, aujourd'hui.
   - La page s'imprime : à l'impression, la navigation et les formulaires sont masqués.
   - Elle s'exporte en texte : `GET /api/administration/semaine?fin=&version=` renvoie un fichier Markdown, réservé à l'administration.
2. **Deux versions** :

   | Version           | Contenu                                                                                                                                                                                                                                                                                                                                                                     |
   | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | **Équipe**        | Les 5 questions complètes : usage ; aide ; agents (signalements par motif, détresses, contestations) ; équipe (traités, ouverts, délai médian, tickets, chapitres validés) ; coût (total, par élève actif). S'y ajoutent l'**état actuel** des critères de suspension qui ne sont pas calmes (ADR 0080) et les **décisions de la semaine** au journal du pilote (ADR 0081). |
   | **Établissement** | Usage, aide, nombre de signalements reçus et traités. Ni coûts, ni détail des agents, ni charge de l'équipe, ni critères, ni journal.                                                                                                                                                                                                                                       |

3. **Diffusion** :
   - un effectif de personnes de 1 à 4 s'affiche « <5 » (élèves inscrits, élèves actifs, détresses) ;
   - pas de score moyen sous 5 quiz ;
   - pas de coût par élève sous 5 élèves actifs ;
   - aucune donnée individuelle, aucun identifiant.
4. **Base** (migration 0043) : `semaine_pilote(p_fin)`, réservée à l'administration, renvoie deux lignes (semaine, précédente) de nombres. Les fenêtres sont des journées entières, de `fin - 6` à `fin` incluses.
   - Les réponses au questionnaire ne portent que leur semaine (lundi), jamais leur jour : on compte celles des semaines qui touchent la période.
   - « Élèves inscrits » compte les élèves actifs aujourd'hui dont le compte existait à la fin de la période. C'est une approximation : la date d'activation n'est pas conservée.
5. **Fonctions pures** (`src/lib/pilote/semaine.ts`) : construction des sections selon la version, masquage, texte Markdown. Elles sont testées sans base.

## Conséquences

- Le rapport de fin de pilote pourra reprendre ces tableaux. Son format reste à décider avec l'établissement.
- Les critères montrés sont ceux du moment de la lecture, pas ceux de la semaine passée : le titre le dit (« état actuel »).

## Tests

- Base : SP01 (administration seulement) et SP02 (deux périodes, bornes, chiffres séparés, délai médian).
- Unitaires : version équipe et masquage ; version établissement sans coûts, agents, critères ni journal ; texte Markdown.
- Bout en bout : les deux versions, choix de la semaine, téléchargement du texte sans numéro ni identifiant, refus sans session, accessibilité.
