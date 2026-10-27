# 0062 — Texte des élèves masqué avant les agents pédagogiques

- **Date** : 2026-10-27 · **Statut** : appliqué (Jalon 9, étape 1). À confirmer par le juriste (question Q8).

## Contexte

Le dossier pour le juriste (Jalon 8) relevait un écart : les numéros, emails et liens étaient masqués avant l'envoi au modèle pour le Support et le Recruteur, mais pas pour le Professeur. Le même écart existait pour l'Évaluateur (réponses courtes, contestations) et le Tuteur (message de l'élève, question du parent). Le masquage existant (`masquerDonneesSensibles`) masque toute suite de 4 chiffres ou plus. Il effacerait donc les nombres d'un exercice de maths (« 1250 », « 3,14159 ») : il était inutilisable pour les agents pédagogiques.

## Décision

1. **Nouvelle fonction** `masquerTexteEleve` (`src/lib/agents/masquage.ts`). Elle masque :
   - les liens et adresses web ;
   - les emails ;
   - les identifiants techniques (UUID) ;
   - les numéros de téléphone : avec un indicatif `+` (8 chiffres ou plus), par groupes de 2 ou 3 chiffres (4 groupes ou plus), ou 8 chiffres ou plus commençant par 0.

   Les nombres d'exercice restent intacts : entiers, décimaux, coordonnées, et grands nombres écrits par tranches de trois chiffres (« 1 000 000 », « 12 345 678 »).
2. **Où** :
   - Professeur : la question est masquée avant le modèle **et** dans l'historique enregistré, qui est renvoyé au modèle aux tours suivants. L'élève voit sa question masquée.
   - Évaluateur : la réponse courte et les messages de contestation sont masqués pour le modèle ; la réponse enregistrée reste celle de l'élève.
   - Tuteur : le message de l'élève et la question du parent sont masqués pour le modèle.
3. **Les tests des agents** appliquent le même masquage que la production : un passage réel teste exactement ce que le modèle recevra.
4. **Aucun prompt modifié.** La détresse reste détectée : seuls les numéros, adresses et liens sont remplacés, jamais les mots.

## Limites

- Les **noms propres** ne sont pas masqués : on ne les repère pas de façon fiable (« Thalès », « Senghor », le prénom d'un personnage). Les agents ne les demandent jamais.
- Un numéro écrit d'une façon inhabituelle (en lettres, avec des espaces irréguliers) peut passer.
- Un numéro de 8 chiffres ou plus commençant par 0, dans un exercice, serait masqué. C'est un cas jugé rare.

## Conséquences

- Question Q8 du dossier pour le juriste mise à jour (version en ligne comprise) : le masquage est fait ; reste à savoir s'il suffit.
- Tests : unitaires (numéros masqués, nombres d'exercice intacts) et de bout en bout (question avec un numéro et un email fictifs, masqués en base et à l'écran).
