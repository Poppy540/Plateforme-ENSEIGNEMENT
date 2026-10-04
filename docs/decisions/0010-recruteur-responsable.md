# 0010 — Le propriétaire décide et finalise tout recrutement

- **Date** : 2026-10-04 · **Statut** : validée par le propriétaire
- **Décision** : l'agent Recruteur prépare et transmet les éléments (sources, fiches candidats, présélection, brouillons de messages, préparation et synthèse d'entretien, dossier d'accord). **Le propriétaire du projet** est le `{{RESPONSABLE}}` du prompt (Partie E) : il décide de chaque étape et finalise (premier contact, entretien, accord, création de compte).
- **Conséquence** : conforme au principe « il prépare, l'humain engage » de la Partie E ; aucun prompt modifié. La valeur de `{{RESPONSABLE}}` est un rôle (« propriétaire du projet »), jamais une donnée personnelle dans le dépôt.
- **Ouvert** : le Recruteur envoie-t-il lui-même les messages approuvés et les invitations d'agenda (outil de messagerie et de calendrier), ou le propriétaire les envoie-t-il lui-même ? Dans le second cas, les clés `MAIL_API_KEY` et `CALENDAR_API_TOKEN` sont retirées (moindre privilège).
