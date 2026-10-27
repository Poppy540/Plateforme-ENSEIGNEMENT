# 0063 — Classe du pilote et vue agrégée de l'enseignant

- **Date** : 2026-10-27 · **Statut** : appliqué (Jalon 9, étape 2), en simulation. **Aucun usage réel avant l'avis du juriste** (Q19).

## Contexte

Le pilote se fera avec une classe d'un établissement. Son enseignant, différent de l'enseignant-référent qui valide les contenus, n'avait aucun moyen de suivre sa classe. Le propriétaire a décidé (ADR 0061) de lui montrer des chiffres agrégés seulement, masqués sous 5 élèves, et aucune donnée individuelle tant que le juriste ne s'est pas prononcé.

## Décision

1. **Classe** (table `classes`) : un référentiel, un niveau, une série éventuelle, un nom et un établissement. Le propriétaire la crée avec `pnpm classe:creer`, qui affiche deux codes et ne met dans le SQL que leurs empreintes :
   - le code **de classe**, que l'enseignant donne à ses élèves (120 jours par défaut) ;
   - le code **d'invitation** de l'enseignant, personnel et à usage unique (14 jours par défaut).
2. **Élève** : il rejoint sa classe depuis son espace avec le code de classe (`rejoindre_classe`), et peut la quitter. Ce rattachement est facultatif et limité à une classe. Le code n'est accepté que si la classe a le même référentiel et le même niveau que l'élève (et la même série si la classe en a une). L'espace lui dit que l'enseignant ne voit jamais son nom ni ses réponses.
3. **Enseignant** : nouveau rôle `enseignant`. Il active son accès sur `/enseignant/activer` avec son code (`activer_enseignant`, refusé sur un compte d'élève, de parent ou de référent). Sa session dure comme celle d'un référent (7 jours).
4. **Tableau agrégé** (`tableau_classe`, calculé par la base, réservé à l'enseignant de la classe) :
   - élèves inscrits dans la classe, et venus sur la plateforme ces 7 derniers jours ;
   - pour chaque chapitre validé des unités du niveau : élèves ayant commencé, terminé, passé le quiz, et score moyen ;
   - les 5 notions les plus souvent manquées aux quiz.

   **Masquage** : tout nombre de 1 à 4 élèves est rendu vide (« moins de 5 »). Le score moyen n'est donné qu'à partir de 5 élèves, et une notion n'apparaît que si 5 élèves au moins l'ont manquée. Si la classe compte moins de 5 élèves, rien d'autre que ce nombre masqué n'est rendu.

   L'enseignant **ne lit aucune table d'élève** (élèves, progression, tentatives, profils) : les règles d'accès ne lui donnent que ce tableau.
5. **Mes données** : la classe figure dans l'export de l'élève, et les classes suivies dans celui de l'enseignant.

## Conséquences

- Nouveau traitement T11 et question Q19 dans le dossier pour le juriste ; ligne ajoutée à la fiche d'information des familles.
- Un enseignant qui connaît bien sa classe pourrait recouper certains chiffres (par exemple, 5 élèves ont terminé un chapitre dans une classe de 6). Le seuil de 5 limite ce risque sans le supprimer ; c'est au juriste de dire s'il est acceptable (Q19).
- Une vue par élève n'est pas construite. Elle demanderait l'avis du juriste et, sans doute, l'accord des parents.
- Tests : base E01 à E04 ; bout en bout `enseignant.spec.ts` (création de la classe, activation, élève qui rejoint et quitte, tableau masqué puis rendu, audit d'accessibilité) ; unitaires du SQL de création.
