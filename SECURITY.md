# Sécurité

Cette plateforme d'enseignement s'adresse à des **élèves mineurs**. Nous prenons au sérieux tout signalement de faille.

## Signaler une faille

**Ne publiez pas la faille** dans une « issue » publique, une discussion ou une demande de fusion.

Utilisez le **signalement privé** de GitHub : onglet **Security** du dépôt, puis **Report a vulnerability**. Seuls les responsables du dépôt verront votre message.

Merci d'indiquer :

- ce qui est touché (page, fonction, fichier) ;
- comment reproduire le problème, pas à pas ;
- ce qu'un attaquant pourrait faire ;
- si vous le savez, une piste de correction.

**N'utilisez que des données fictives.** N'accédez jamais aux données d'une autre personne, ne les modifiez pas et ne les conservez pas. N'essayez pas de rendre le service indisponible.

## Ce qui se passe ensuite

| Délai            | Étape                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| 3 jours ouvrés   | Accusé de réception                                                                            |
| 10 jours ouvrés  | Première évaluation : la faille est-elle confirmée, et quelle est sa gravité ?                 |
| Selon la gravité | Correction, puis publication d'un avis de sécurité. Vous y êtes remercié, si vous le souhaitez |

Une faille qui expose des données d'élèves est traitée en priorité. Elle peut conduire à fermer l'accès des élèves le temps de la corriger.

## Versions concernées

Seule la dernière version de la branche principale est maintenue.

## Ce que le dépôt fait déjà

- Les failles connues des dépendances sont vérifiées à chaque contrôle (`pnpm audit:dependances`, ADR 0105), et Dependabot propose les mises à jour chaque semaine.
- Le code est analysé par CodeQL.
- Aucun secret n'est versionné. Les modèles de configuration (`secrets/*.env.example`) ne contiennent aucune valeur.
- Toutes les données du dépôt sont fictives.
