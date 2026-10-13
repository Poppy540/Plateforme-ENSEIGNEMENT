# Procédure en cas de détresse d'un élève

> **À valider** par le propriétaire, l'établissement et le juriste (signalement d'un mineur en danger, secret, information des parents). Les contacts sont à compléter par l'équipe : **Claude Code n'en invente aucun**.

La plateforme **n'est pas un service d'urgence** et les agents IA ne gèrent jamais seuls une détresse (cadrage §5.1). Leur rôle s'arrête à : répondre avec bienveillance, encourager l'élève à parler à un adulte de confiance, **signaler**. Tout le reste est fait par des humains.

## D'où viennent les alertes

| Source | Ce qui arrive dans `/administration` |
|---|---|
| Professeur IA (conversation de cours) | Signalement `détresse`, priorité 1 |
| Évaluateur (réponse ou contestation d'un quiz) | Signalement `détresse`, priorité 1 |
| Tuteur (mot de l'élève, plan de révision) | Signalement `détresse`, priorité 1 ; décrochage prolongé en priorité 2 |
| Support (page Aide) | Ticket **et** signalement `détresse`, priorité 1 |

La base place toujours une détresse en priorité 1, en tête de la file (« IMMÉDIAT »). Le résumé est court et ne contient pas de code ni de donnée bancaire.

## Délais proposés (à valider)

| Moment | Délai de prise en compte |
|---|---|
| Jours scolaires, [7 h – 20 h] | **2 heures** au plus |
| Nuit, week-end, vacances | Dès la première veille suivante, et au plus **12 heures** |

Ces délais reposent sur l'**alerte automatique** de la personne de veille (condition préalable n° 8, ADR 0036) : message sans donnée d'élève dès l'arrivée du signalement, puis relance toutes les 2 heures tant qu'il n'est pas pris en charge. Elle est construite avec un envoi simulé ; le fournisseur réel reste à brancher.

## Étapes

1. **Lire** le signalement (résumé, source, date). Ne pas chercher d'autres informations que celles nécessaires.
2. **Évaluer** avec un second membre de l'équipe si possible :
   - **Danger immédiat** (violence subie, idée de se faire du mal, situation de risque grave) → étape 3 sans attendre ;
   - **Préoccupation** (tristesse, harcèlement évoqué, difficulté familiale) → étape 4 ;
   - **Fausse alerte** manifeste (phrase sortie de son contexte, exercice de vocabulaire) → étape 5, avec la justification.
3. **Danger immédiat** : prévenir immédiatement le **correspondant de l'établissement** ; si personne n'est joignable et que le danger est grave, appeler les **services d'urgence** listés ci-dessous. Le propriétaire est informé dans l'heure.
4. **Préoccupation** : informer le correspondant de l'établissement **dans la journée**, qui décide avec l'équipe éducative (infirmier, conseiller, chef d'établissement) de la suite et de l'information des parents.
5. **Clore** dans `/administration` (« Marquer comme traité », audit enregistré) et noter au journal du pilote : date, catégorie, suite donnée, **sans nom ni détail personnel**.

## Ce que l'équipe ne fait jamais

- Poser un diagnostic, promettre le secret ou une issue.
- Contacter l'élève directement par un canal non prévu, ou par l'intermédiaire d'un agent IA.
- Mener seule une enquête, en parler à d'autres élèves ou hors des personnes concernées.
- Écrire des détails sensibles dans la plateforme, un ticket ou un message.
- Laisser un signalement de détresse en attente derrière d'autres tâches.

## Contacts (à compléter avant le pilote)

| Contact | Nom ou service | Téléphone | Disponibilité |
|---|---|---|---|
| Veille n° 1 | [……] | [……] | [……] |
| Veille n° 2 | [……] | [……] | [……] |
| Propriétaire | [……] | [……] | [……] |
| Correspondant de l'établissement | [……] | [……] | [……] |
| Infirmier ou conseiller de l'établissement | [……] | [……] | [……] |
| Services d'urgence (Gabon) | [à vérifier localement] | [……] | 24 h / 24 |
| Ligne d'écoute ou de protection de l'enfance, si elle existe | [à vérifier localement] | [……] | [……] |

## Exercice avant le lancement

Avant le premier jour, l'équipe déclenche une **fausse détresse** avec un compte fictif (« Je n'en peux plus, j'ai envie de disparaître ») et vérifie : alerte reçue, délai tenu, contacts joignables, clôture enregistrée. Le résultat est noté au journal du pilote.
