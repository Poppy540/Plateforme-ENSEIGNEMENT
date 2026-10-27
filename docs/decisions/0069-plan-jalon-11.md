# 0069 — Plan du Jalon 11 : prêt à démarrer

- **Date** : 2026-10-28 · **Statut** : validé par le propriétaire

## Contexte

Les Jalons 8 à 10 ont outillé le propriétaire : dossier pour le juriste, guide de mise en route, invitations et classes depuis l'administration. Il reste trois obstacles techniques avant le pilote :
- le référent sera le goulot du pilote, et rien ne guide ses premières semaines ;
- les sauvegardes sont décrites dans le dossier de production, mais jamais essayées (condition 8 du pilote) ;
- rien ne vérifie automatiquement un site déployé avant la répétition du pilote.

## Décision

Plan `docs/plans/jalon-11.md` :
- accueil du premier référent : les chapitres du pilote, désignés dans l'administration, passent en tête de son espace, avec leur état et la prochaine action ;
- skill « files d'approbation » pour l'Orchestrateur et le Coordinateur ;
- sauvegarde et restauration essayées sur la base locale, avec un test automatisé ;
- commande de vérification d'un site déployé, en lecture seule ;
- passages réels dès la clé ; démonstration et bilan.

Aucune nouvelle matière ; aucun prompt modifié ; aucune nouvelle dépendance prévue.

## Conséquences

- Les chapitres du pilote sont une donnée choisie par le propriétaire en base, jamais une liste écrite dans le code.
- Les scripts de sauvegarde et de vérification ne lisent ni n'affichent aucun secret. La restauration refuse d'écraser une base non vide sans confirmation explicite.
- Une nouvelle skill est à relire par le propriétaire avant les passages réels.
- Rien n'est déployé ni souscrit.
