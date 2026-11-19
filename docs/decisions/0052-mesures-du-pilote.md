# 0052 — Mesures du pilote : compteur de lecture agrégé et questionnaire anonyme

- **Date** : 2026-10-21 · **Statut** : appliqué (Jalon 6, étape 5). Les questions restent **à valider** par le propriétaire.

## Contexte

Le bilan du pilote doit montrer si les cours sont suivis et ce qu'en pensent les élèves et les parents, sans suivre personne. Les indicateurs quotidiens (ADR 0046) ne disent rien des vidéos ni des leçons.

## Décision

1. **Compteur de lecture agrégé** : pour chaque chapitre et chaque jour, la base compte :
   - les vidéos démarrées ;
   - les vidéos vues jusqu'au bout ;
   - les leçons écrites ouvertes.
   - **Aucun identifiant**. Chaque événement est compté une fois par page.
   - Un quota par élève et par jour (`VISIONNAGES_PAR_JOUR`, 60) empêche de gonfler les chiffres.
   - Sans réseau, rien n'est gardé ni renvoyé plus tard.
2. **Questionnaire anonyme** (`questionnaire.yaml` du pack) :
   - **réponses fermées uniquement**, sur une échelle de 1 à 5 ou par choix ; aucun texte libre ;
   - les élèves répondent depuis leur espace, les parents depuis le lien d'un rapport (accord actif) ;
   - une seule réponse par personne, ou par accord parental, et par version.
   - Pour l'anonymat :
     - les réponses sont gardées sans compte, sans heure, avec la semaine seulement ;
     - la mention « déjà répondu » est une empreinte gardée à part, sans lien avec la réponse.
   - Une version déjà répondue ne peut plus changer : il faut en créer une nouvelle.
   - **Rien n'est montré tant que le statut n'est pas « valide »** : celui du Gabon est « à valider ».
3. **Diffusion**, sur la page de pilotage et dans les exports CSV, réservée à l'administration :
   - compteurs de 1 à 4 affichés « <5 » ;
   - un groupe (version, élèves ou parents) n'apparaît qu'à partir de 5 réponses ;
   - au-delà, une case de 1 à 4 réponses est masquée.

## Conséquences

- Questions proposées, à valider par le propriétaire :
  - élèves : aide à comprendre, clarté du professeur IA, vidéo ou leçon écrite, gêne de la connexion, recommandation ;
  - parents : utilité des rapports, régularité de l'enfant, coût des données mobiles, confiance.
  - Pour les activer : `statut: valide` dans `referentiels/gabon/questionnaire.yaml`, puis réimport du pack.
- Le juriste peut vouloir une mention d'information sur le questionnaire : c'est à prévoir dans les conditions du pilote.
- Les réponses ne sont rattachées à aucun compte ; elles ne figurent donc pas dans l'export « Mes données ».
