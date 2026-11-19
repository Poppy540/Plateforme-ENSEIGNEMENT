# 0110 — Plan du Jalon 22 : exportabilité à jour

- **Date** : 2026-11-09 · **Statut** : validé par le propriétaire

## Contexte

Le pack fictif `zz-fictif` (ADR 0041, Jalon 4) a prouvé qu'un second pays s'ajoute sans modifier le code. Depuis, les Jalons 5 à 21 ont ajouté de nombreuses fonctions : classes et capacité, enseignant, chapitres du pilote, kit du référent, tableau de bord, hors ligne étendu, compétences. Le portage n'a pas été revérifié sur ces fonctions. Le Jalon 21 attend le curriculum officiel de Mathématiques 3e.

## Décision

Plan `docs/plans/jalon-22.md` :

1. inventaire de ce qui dépend d'un pays, avec le test de garde étendu ;
2. journée d'ouverture rejouée pour le pays Z, avec l'étanchéité entre pays ;
3. « Ajouter un pays » guidé : `pnpm pack:nouveau`, `pnpm pack:verifier`, guide pas à pas ;
4. paquet de déploiement par pays ;
5. passages réels dès la clé ;
6. bilan.

Tout écart est corrigé de façon générique. Données fictives seulement.

Écartés pour ce jalon : la remise en ordre de `memory.md` et des attentes, une nouvelle matière, la pause.

## Conséquences

- Le pack du Gabon n'est pas touché, sauf un défaut révélé et signalé.
- Un vrai second pays reste hors jalon : il demande des sources officielles et une équipe locale.
