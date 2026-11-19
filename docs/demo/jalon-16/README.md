# Captures du Jalon 16

La capacité de classe (décision D10, ADR 0093) et la limite d'essais de code (ADR 0092), sur téléphone simulé, avec des données **fictives** : un administrateur, trois élèves fictifs, une classe « 3e B (démonstration) ». Rien n'est effacé.

Régénérables avec `cd application && pnpm demo:captures tests/demo/jalon-16.spec.ts`, puis `bash scripts/compresser-captures.sh ../docs/demo/jalon-16`.

| #   | Capture                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------- |
| 01  | [Création d'une classe : champ « Capacité de la classe » (1 à 200)](01-formulaire-capacite.png)                        |
| 02  | [Liste des classes : « Élèves rattachés : 0 sur 1 (capacité) »](02-liste-capacite.png)                                 |
| 03  | [Élève : « Cette classe est complète »](03-eleve-classe-complete.png)                                                  |
| 04  | [Administration : alerte « Classe … complète » dans la file humaine, source Plateforme](04-alerte-classe-complete.png) |
| 05  | [Capacité relevée à 30 : « 1 sur 30 (capacité) »](05-capacite-relevee.png)                                             |
| 06  | [Élève : « Trop d'essais de code aujourd'hui » après 10 codes faux](06-trop-d-essais.png)                              |
