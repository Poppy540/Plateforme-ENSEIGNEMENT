# 0109 — Programme du pilote : obtenir le curriculum, pack prêt pour les compétences (décision D16)

- **Date** : 2026-11-09 · **Statut** : accepté (D16 a, choisie par le propriétaire)

## Contexte

La recherche de l'étape 1 du Jalon 21 (`referentiels/gabon/sources/mathematiques-3e.md`) n'a pas trouvé le programme officiel de Mathématiques de 3e en ligne. Elle a aussi établi que, depuis la rentrée 2026-2027, la 3e passe à l'approche par les compétences (APC), avec un BEPC refondu dès la session 2027 et un coefficient de 1 par compétence. La liste de 7 chapitres du pack, d'origine générique, risque donc d'être dépassée.

Trois choix étaient présentés :

- **a : obtenir le curriculum** (recommandé) ;
- b : laisser le référent compléter ;
- c : compléter au statut « déduit » à partir de programmes voisins.

## Décision (D16 a)

- **Demande du curriculum** : un modèle de lettre (`docs/pilote/demande-curriculum.md`), à compléter et envoyer par le propriétaire à l'IPN ou à l'établissement. Elle demande trois documents :
  - le curriculum de 3e par compétences ;
  - le format du BEPC 2027 ;
  - la liste des manuels retenus.

  Le point s'ajoute à la liste de ce qui attend le propriétaire.

- **Pack prêt pour les compétences**, champs facultatifs d'un programme (`programmes/<unité>.yaml`) :
  - `competences` : code, intitulé, chapitres qui la travaillent, source ;
  - par chapitre, `objectifs` et `source`.

  Le pack les lit et les contrôle (compétence complète, code unique, chapitres existants), avec des tests sur le pack fictif. Ils ne vont pas encore en base : on les branchera sur ce que demandera le curriculum réel (vue de l'enseignant, quiz, BEPC).

- **Rien n'est ajouté au programme du pilote** en attendant : il reste « à valider », avec ses 7 titres.

## Conséquences

- Les étapes 2 (programme complété) et 3 (fiche de relecture) du Jalon 21 attendent le curriculum.
- Si le curriculum change la structure en profondeur (compétences plutôt que chapitres), un plan dédié vous sera proposé avant tout changement en base.
