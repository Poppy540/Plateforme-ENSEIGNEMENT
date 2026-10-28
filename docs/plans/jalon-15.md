# Plan du Jalon 15 — tableau de bord du pilote

**Statut** : validé par le propriétaire le 2026-10-28 (décisions ci-dessous, ADR 0087).

**Objectif** : le cycle du pilote est outillé de bout en bout, mais il est réparti sur une dizaine de pages et les demandes faites au propriétaire sont dispersées dans dix bilans. Le Jalon 15 en fait :

- une page d'entrée unique, qui dit où en est le pilote et quelle est la prochaine action ;
- une liste à jour de tout ce qui attend le propriétaire.

Il rend aussi le rapport de fin lisible sur téléphone. **Rien n'est déployé ni souscrit dans ce jalon.**

**Principes inchangés** :

- données fictives seulement ;
- aucun chiffre pour un groupe de moins de 5 élèves ;
- aucune suppression ;
- aucun prompt d'agent modifié.

## Étapes (dans cet ordre)

| #   | Étape                                | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Besoin du propriétaire                           |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 0   | Plan                                 | Ce plan, l'ADR 0087 et `memory.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Validation (faite)                               |
| 1   | Tableau de bord du pilote            | Page « Tableau de bord du pilote », placée en tête de l'administration. Elle déduit la **phase** des données : préparation (avant le premier jour), en cours, terminé, clôturé. Pour chaque phase : le décompte qui compte (conditions N / 12, critères atteints ou à examiner et chiffres clés de la semaine, gestes de clôture N / 8) et **la prochaine action**, avec un lien vers la bonne page. Les pages existantes ne changent pas. Fonction de phase pure et testée ; tests de bout en bout et accessibilité.                                                                                               | —                                                |
| 2   | Ce qui vous attend                   | Une liste unique, à jour, de tout ce qu'attendent les bilans 6 à 14 : juriste, clé API, relecture des skills, référents, chapitres du pilote, fournisseurs et hébergement, seuils et budget, GitHub Actions, dates avec l'établissement… Pour chaque point : de quoi il s'agit, où agir, et ce qu'il débloque. L'état est **calculé** quand la plateforme peut le voir (condition cochée, chapitres désignés, référent actif, seuils fixés dans le pack) ; sinon, la liste renvoie au document. Document `docs/attentes-proprietaire.md`, plus un encadré sur le tableau de bord. Les bilans y renvoient désormais. | Tenir la liste à jour en cochant au fil de l'eau |
| 3   | Rapport de fin lisible sur téléphone | Sur un écran étroit, les tableaux du rapport de fin (total et une colonne par semaine) passent en cartes, une par indicateur, avec le total et les semaines. Le tableau reste à l'impression et sur grand écran. Même chose pour le rapport de la semaine si besoin. Tests et captures sur téléphone.                                                                                                                                                                                                                                                                                                               | —                                                |
| 4   | Passages réels des agents            | Repris des Jalons 11 à 14 : dès que la clé, la relecture des skills et l'accord sont là, mini-essais, puis séries complètes (~121 USD) après un nouvel accord.                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Clé API ; accord sur chaque coût                 |
| 5   | Démonstration et bilan               | Le tableau de bord dans les quatre phases d'un pilote fictif, la liste « Ce qui vous attend », le rapport de fin sur téléphone. Captures et bilan, comme aux jalons précédents.                                                                                                                                                                                                                                                                                                                                                                                                                                     | —                                                |

L'étape 4 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-10-28)

1. **Piste retenue** : tableau de bord du pilote, avec la liste de ce qui attend le propriétaire et le rapport de fin lisible sur téléphone.
2. **Écartés pour ce jalon** :
   - la commande unique de contrôles locaux ;
   - la skill « faible débit » ;
   - une nouvelle matière de 3e.

## Hors Jalon 15

- Le déploiement et toute souscription.
- Le déblocage de GitHub Actions : réglage du compte, par le propriétaire.
- Toute nouvelle fonction du pilote : ce jalon rassemble et clarifie, il n'ajoute pas de règle.
