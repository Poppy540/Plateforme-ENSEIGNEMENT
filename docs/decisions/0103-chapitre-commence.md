# 0103 — Chapitre « commencé » noté par la plateforme (décision D15)

- **Date** : 2026-11-02 · **Statut** : accepté (D15 a, choisie par le propriétaire ; bilan du Jalon 19, §7)

## Contexte

La vue de l'enseignant (ADR 0063) compte, pour chaque chapitre, les élèves qui l'ont commencé ou terminé. Seul le Professeur IA écrivait la progression, quand l'élève lui posait une question. Pendant la répétition de la journée d'ouverture, une classe qui avait lu le chapitre et passé son quiz affichait « Commencé : 0 ». Le chiffre trompait l'enseignant.

Trois choix étaient présentés :

- **a : « commencé » dès l'ouverture de la leçon ou le quiz** (recommandé) ;
- b : statu quo ;
- c : retirer la colonne.

## Décision (D15 a)

- **La plateforme note elle-même « en cours »**, sans agent, dans trois cas :
  - l'élève ouvre la leçon écrite ;
  - l'élève démarre la vidéo du chapitre ;
  - l'élève passe le quiz du chapitre.
- **Mise en œuvre en base** (migration 0049) :
  - une fonction interne, `marquer_chapitre_commence`, que personne ne peut appeler directement ;
  - elle est appelée par `noter_visionnage`, le même signal que le compteur agrégé de l'ADR 0052, et par un déclencheur sur `tentatives_quiz`.
- **Jamais de retour en arrière** : un chapitre terminé reste terminé. Une vidéo terminée seule ne marque rien.
- **Aucune donnée nouvelle** : la progression existait déjà. Elle est seulement remplie plus tôt. La vue de l'enseignant reste agrégée et masquée sous 5 élèves.

## Conséquences

- Tests de base PC01 à PC04 :
  - leçon ouverte → en cours ;
  - pas de retour en arrière ;
  - quiz → en cours ;
  - fonction interne inaccessible.
- La journée d'ouverture vérifie maintenant « Commencé : 30 ».
- Les droits des agents ne changent pas (cadrage §5.2) : la plateforme écrit, pas l'Évaluateur.
