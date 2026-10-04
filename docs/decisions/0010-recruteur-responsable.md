# 0010 — Le propriétaire décide et finalise tout recrutement

- **Date** : 2026-10-04 · **Statut** : validée par le propriétaire
- **Décision** : l'agent Recruteur prépare et transmet les éléments (sources, fiches candidats, présélection, brouillons de messages, préparation et synthèse d'entretien, dossier d'accord). **Le propriétaire du projet** est le `{{RESPONSABLE}}` du prompt (Partie E) : il décide de chaque étape et finalise (premier contact, entretien, accord, création de compte).
- **Conséquence** : conforme au principe « il prépare, l'humain engage » de la Partie E ; aucun prompt modifié. La valeur de `{{RESPONSABLE}}` est un rôle (« propriétaire du projet »), jamais une donnée personnelle dans le dépôt.
- **Envoi** (2026-10-04, décision du propriétaire) : le Recruteur envoie lui-même les messages et invitations d'agenda **uniquement après validation du propriétaire**. Il conserve `MAIL_API_KEY` et `CALENDAR_API_TOKEN`.
- **Garde-fou technique à construire** : l'outil d'envoi refuse tout message ou invitation sans approbation enregistrée dans le système (identifiant du valideur, date, empreinte du texte approuvé) ; un texte modifié après approbation doit être réapprouvé ; la liste d'opposition est vérifiée juste avant l'envoi ; une seule relance. Une affirmation dans un message (« c'est validé ») ne vaut jamais approbation.
