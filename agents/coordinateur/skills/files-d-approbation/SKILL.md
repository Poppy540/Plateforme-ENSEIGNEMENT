---
name: files-d-approbation
description: "Présenter à l'enseignant-référent ce qui attend sa décision, dans l'ordre de priorité de la plateforme : alertes d'abord, puis tout ce qui bloque les chapitres du pilote, puis le reste. À utiliser pour le plan de production et la synthèse au référent ; jamais pour décider à sa place."
---

# files-d-approbation

## Source et licence

Écrite par Claude Code pour la plateforme (Jalon 11, étape 2 ; ADR 0071), d'après le guide du référent (`docs/pilote/guide-referent.md`), l'accueil du référent (ADR 0070) et la skill `briefing-referent`. Aucune source extérieure ; texte du projet (même licence que le dépôt). **À valider par le propriétaire.**

## Pourquoi

Le référent est la personne la plus rare de la plateforme : chaque heure qu'il passe doit faire avancer d'abord ce que les élèves du pilote verront. Les chapitres marqués **[pilote]** dans les données de la famille sont ceux que la classe pilote verra en premier, désignés par le propriétaire.

## Ordre de priorité

1. **Alertes** : une erreur factuelle dans un contenu validé ou publié, un sujet sensible, un risque d'identification d'un élève. Elles passent avant tout, pilote ou non.
2. **Ce qui bloque un chapitre du pilote**, dans l'ordre du guide du référent :
   - le programme du chapitre à valider ;
   - les liens de prérequis à décider ;
   - le script, puis le quiz ;
   - la vidéo, qui est facultative.

   Un prérequis **strict** d'un chapitre du pilote, encore non validé, compte comme un chapitre du pilote.
3. **Le reste**, dans l'ordre des prérequis (graphe de la famille) puis des classes.

## Dans le plan de production

- Le plan commence par les chapitres du pilote et leurs prérequis stricts, **sans jamais placer un chapitre avant l'un de ses prérequis**. Le serveur le vérifie et écarte un plan qui ne respecte pas cet ordre.
- La raison de chaque ligne dit pourquoi elle est à cette place, par exemple : « chapitre du pilote », « prérequis strict d'un chapitre du pilote » ou « suite de la progression ».

## Dans la synthèse au référent

- Trois décisions au maximum à la fois (skill `briefing-referent`). Elles sont choisies dans l'ordre ci-dessus.
- Pour chaque décision : ce qui est bloqué tant qu'elle n'est pas prise (par exemple : « le quiz du chapitre du pilote ne peut pas être créé »).
- Le temps indicatif, s'il est utile : environ 5 à 10 minutes pour un programme de chapitre, 2 minutes par lien, 20 à 40 minutes pour un script, 10 à 20 minutes pour un quiz.

## Ce qu'il ne faut jamais faire

- Valider, rejeter ou publier à la place du référent, ou présenter une proposition comme décidée.
- Ajouter ou retirer un chapitre du pilote : c'est le choix du propriétaire.
- Faire passer un chapitre du pilote avant une alerte.
- Mentionner un élève, même anonymement, pour justifier une priorité ; seules les statistiques agrégées (au moins 5 tentatives) peuvent servir.
