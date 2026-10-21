# 0050 — Sciences en 3e et liens de prérequis entre familles

- **Date** : 2026-10-21 · **Statut** : appliqué (Jalon 6, étape 3). Contenus **provisoires**, à valider par un référent de Sciences.

## Contexte

Le plan du Jalon 6 (ADR 0048) ajoute une deuxième famille de matières, Sciences en 3e. La SVT et la Physique-Chimie s'appuient sur des notions de Mathématiques (équations, fonction linéaire, puissances de dix, probabilités).

Jusqu'ici, un lien de prérequis devait être décidé par un référent des deux familles. Cette règle bloquait tout lien entre deux familles : un tel référent est rare.

## Décision

1. **Contenus** (pack Gabon, statut « à valider ») :
   - `ga-3e-svt` : 5 chapitres ;
   - `ga-3e-physique-chimie` : 4 chapitres ;
   - intitulés repris mot pour mot du cadrage ;
   - valeurs des agents Professeur, Scénariste et Évaluateur, et fiches d'avatar synthétique ;
   - méthode et garde-fous de la famille Sciences : démarche d'investigation, vérification des unités, aucun conseil médical individuel, aucune manipulation dangereuse à domicile.
2. **Graphe** : `prerequis/sciences.yaml`, 15 liens proposés :
   - 9 dans la famille, en 3e : les programmes de Sciences de 6e à 4e ne sont pas encore dans le pack ;
   - 6 vers les Mathématiques de 4e.
   - Les contrôles existants s'appliquent à tous les fichiers ensemble : classe inférieure ou égale, séries compatibles, pas de cycle.
3. **Lien entre deux familles** (décision du propriétaire, 2026-10-21) : le **référent de la famille du chapitre qui dépend** décide seul.
   - Il lit le chapitre visé (titre, sous-thèmes) sans pouvoir l'ouvrir, le valider ni le modifier.
   - Dans une même famille, la règle reste inchangée : un référent de la famille des deux chapitres.
   - La règle est appliquée en base (migration 0031 : `peut_decider_prerequis`, `est_prerequis_de_mes_chapitres`) et affichée dans l'espace référent (matière et mention « Autre famille de matières »).
4. Le Coordinateur reste dans sa famille : il ne voit pas les liens vers une autre famille ni leurs chapitres (droits inchangés, §5.2).

## Conséquences

- Un lien validé vers les Mathématiques sert au Tuteur, qui peut conseiller à un élève de revoir un chapitre de Maths de 4e avant l'électricité.
- Un référent de Mathématiques n'a pas son mot à dire sur ce lien. S'il juge le lien faux, il passe par le propriétaire.
- À fournir par le propriétaire :
  - un référent de Sciences ;
  - les programmes officiels de l'IPN (SVT, Physique-Chimie) ;
  - la validation des valeurs provisoires des agents.
