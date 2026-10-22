# 0054 — Accessibilité et téléphones modestes

- **Date** : 2026-10-21 · **Statut** : appliqué (Jalon 7, étape 1).

## Contexte

Les élèves du pilote utilisent surtout des smartphones, parfois anciens, avec une police agrandie ou un lecteur d'écran. Aucun audit d'accessibilité n'avait été fait.

## Décision

1. **Audit automatique** de chaque page des cinq publics (visiteur, élève, parent, référent, administration) avec `@axe-core/playwright` 4.13.0 :
   - dépendance de test seulement, version épinglée exactement ;
   - la 4.14.0, publiée depuis moins de deux semaines, a été écartée ;
   - règles WCAG 2.0, 2.1 et 2.2, niveaux A et AA, plus les bonnes pratiques ;
   - pages auditées en thème clair et, pour l'élève, en thème sombre ;
   - **aucune violation admise** : une régression fait échouer `pnpm test:e2e` en nommant la règle et l'élément.
2. **Contrôles qu'un outil ne fait pas seul** (`tests/bout-en-bout/accessibilite.spec.ts`) :
   - **reflow** : aucun défilement horizontal sur un écran de 320 px, même avec le texte agrandi à 200 % ;
   - **zones à toucher** : boutons et champs d'au moins 44 px de haut sur les pages des élèves ;
   - **clavier** : connexion complète sans souris, avec un focus toujours visible.
3. **Corrections** :
   - les tableaux défilants (pilotage, recrutement, conformité, Coordinateur) sont atteignables au clavier et nommés ;
   - le focus est visible partout (contour de 3 px) ;
   - boutons et champs font au moins 44 px de haut, les cases à cocher sont agrandies ;
   - aucune animation si le téléphone les refuse ;
   - les listes de chapitres et de cartes se replient, et un mot plus large que la ligne est coupé (`overflow-wrap: break-word`, césure française là où le téléphone la connaît) : plus de débordement avec le texte agrandi. Un mot qui tient sur la ligne n'est jamais coupé. Ce réglage a été corrigé à l'étape 6 : `anywhere` coupait trop tôt ;
   - le champ du code de connexion reçoit le focus à l'arrivée sur sa page, où il est le seul champ. Cela aide au clavier et au remplissage automatique du code reçu par SMS.

## Conséquences

- L'audit automatique ne remplace pas un essai avec de vrais utilisateurs. Pendant le pilote, à vérifier avec l'établissement : lecteur d'écran (TalkBack) sur un téléphone Android d'entrée de gamme, et lisibilité des vidéos et des sous-titres.
- Le questionnaire du pilote n'est audité qu'une fois validé : son formulaire n'apparaît qu'à ce moment-là. Le formulaire fictif du pays « zz » passe déjà par les tests de bout en bout.
