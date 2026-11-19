# 0085 — Clôture du pilote

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 14, étape 2).

## Contexte

La procédure du pilote (`docs/pilote/procedure.md`, « Après ») prévoit plusieurs gestes de fin :

- questionnaires de fin ;
- réunion de bilan ;
- rapport ;
- décision du propriétaire (arrêter, prolonger, élargir) ;
- sort des données.

Aucun de ces gestes n'était suivi par la plateforme, et la décision finale n'était notée nulle part.

## Décision

1. **Page `/administration/cloture`** (lien « Clôture du pilote ») : 8 gestes, chacun avec un état écrit (« Fait », « À faire », « Sans objet ») et la preuve attendue. En tête, le décompte « N / 8 gestes faits » ; la clôture est complète quand chaque geste est fait ou sans objet.
2. **Quatre gestes vérifiés par la plateforme** :

   | Geste                     | Fait quand                                                                                                                                               |
   | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | Période terminée          | Le dernier jour est saisi et passé (ADR 0084).                                                                                                           |
   | Rapport de fin téléchargé | Le rapport a été téléchargé depuis la fin du pilote. Chaque téléchargement est noté au journal d'audit (`rapport_fin_telecharge`).                       |
   | Décision finale           | Une décision est notée au journal du pilote.                                                                                                             |
   | Mise en veille            | Si la décision est d'arrêter : accès des élèves fermé et agents face aux élèves (Professeur, Évaluateur, Tuteur, Support) suspendus. Sinon : sans objet. |

3. **Quatre gestes cochés avec une preuve datée** :
   - questionnaires de fin ;
   - réunion de bilan ;
   - familles et établissement informés ;
   - dernière sauvegarde avec restauration essayée.

   Comme pour les conditions (ADR 0078), la preuve fait 3 à 300 caractères ; ses coordonnées sont masquées ; la date ne peut pas être dans le futur ; un retrait demande un motif. Tout est tracé. La base refuse de cocher un geste qu'elle vérifie.

4. **Décision finale** : volet « Noter la décision finale » (arrêter, prolonger ou élargir, avec un motif). Elle s'inscrit au journal du pilote, avec le nouveau type « Décision finale ». La dernière décision fait foi. Pour **prolonger**, on note la décision puis on corrige la période.
5. **Rien n'est supprimé** : la mise en veille passe par les boutons existants de suspension et de fermeture de l'accès (ADR 0081). Le sort des données est l'étape suivante, en simulation seulement.
6. **Base** (migration 0045) :
   - valeur `decision_finale` ajoutée au type des entrées du journal ;
   - table `gestes_cloture`, illisible directement ;
   - fonctions d'administration `faits_cloture`, `gestes_cloture_coches`, `cocher_geste_cloture`, `decocher_geste_cloture`, `noter_decision_finale` et `noter_rapport_fin_telecharge`.

## Tests

- Base : CL01 (administration seulement), CL02 (faits : période finie, téléchargement après la fin, dernière décision ; décision inconnue ou motif trop court refusés) et CL03 (gestes cochés, geste vérifié refusé, date future refusée, audit).
- Unitaires : 8 gestes sans pays en dur, état de départ, arrêt complet, arrêt sans mise en veille, prolongation (sans objet), lecture de la décision.
- Bout en bout : pilote terminé, téléchargement noté, décision d'arrêt, mise en veille à faire, geste coché avec numéro masqué, décision au journal, accessibilité.
