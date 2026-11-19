# 0051 — Leçons écrites tirées des scripts validés

- **Date** : 2026-10-21 · **Statut** : appliqué (Jalon 6, étape 4).

## Contexte

Beaucoup d'élèves ont une connexion faible ou des données mobiles comptées : une vidéo n'est pas toujours regardable. Le script validé de chaque chapitre contient déjà, section par section, le texte du cours.

## Décision

1. La base sert à l'élève connecté la **leçon écrite** d'un chapitre validé (`lecon_du_chapitre`, migration 0032), sous quatre conditions, comme pour la production vidéo :
   - script au statut « validé » ;
   - contenu inchangé depuis son empreinte ;
   - dernière approbation « valide » portant sur la même version et la même empreinte ;
   - chapitre validé.
   - Si une seule condition manque, la base ne sert rien.
2. Elle ne sert que le texte destiné aux élèves :
   - titre et texte de chaque section, dans l'ordre ;
   - glossaire ;
   - consignes et sécurité des travaux pratiques.
   - **Jamais** les notes au référent (points à vérifier, exemples locaux à valider, idées de questions, message) ni les indications visuelles. Les élèves ne lisent toujours pas la table des scripts.
3. **Aucun nouveau contenu** : aucun agent ne réécrit le texte. Ce qui s'affiche est exactement ce que le référent a validé.
4. La leçon s'affiche sur la page du chapitre :
   - ouverte d'emblée si la vidéo n'est pas publiée, repliée sinon ;
   - en texte seul, sans image ni script ;
   - la page du chapitre étant déjà gardée par le service worker (ADR 0044), la leçon se relit **hors ligne** une fois ouverte.

## Conséquences

- Quelques kilo-octets de plus par page de chapitre, sous le budget de 200 Ko.
- Une leçon disparaît dès que le chapitre repasse « à valider » ou que l'approbation ne correspond plus. Elle revient avec un nouveau script validé.
- Les leçons n'apparaîtront qu'avec les premiers scripts validés par un référent : aucun n'est validé à ce jour.
