# Plan du Jalon 21 — programme du pilote complet

**Statut** : validé par le propriétaire le 2026-11-03 (piste choisie, ADR 0108). Rien d'autre n'est commencé.

**Objectif** : le programme de Mathématiques 3e du pack (`referentiels/gabon/programmes/ga-3e-mathematiques.yaml`) ne contient aujourd'hui que **7 titres de chapitres**. Ils sont repris du cadrage, sur une « base francophone générique ». Il n'y a ni sous-thèmes, ni objectifs, ni volumes horaires, ni liens de prérequis d'un chapitre à l'autre. Le référent devrait tout reconstruire lui-même.

Le Jalon 21 prépare un programme **complet et sourcé**, au statut « à valider », pour qu'il n'ait plus qu'à vérifier, corriger et valider.

**Règle absolue** : rien n'est inventé.

- Chaque donnée ajoutée cite sa source, avec son statut dans `SOURCES.md` : « officiel », « déduit » ou « proposition à valider ».
- Ce qui n'a pas de source reste vide et est signalé.
- Le pack reste « à valider » : seul le référent valide.
- Rien n'est montré aux élèves avant cette validation (règle existante).

## Étapes (dans cet ordre)

| #   | Étape                          | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                        | Besoin du propriétaire                                                         |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 0   | Plan                           | Ce plan, l'ADR 0108 et `memory.md`.                                                                                                                                                                                                                                                                                                                                                                                                            | Validation (faite)                                                             |
| 1   | Sources                        | Recherche des documents publics sur le programme de Mathématiques de 3e au Gabon : programme officiel (IPN, ministère), épreuves et sujets du BEPC, manuels en usage. Chaque document est consigné dans `referentiels/gabon/sources/mathematiques-3e.md` : titre, éditeur, date, adresse, accès, **fiabilité**. Les manques sont dits clairement, par exemple « programme officiel introuvable en ligne : à demander à l'IPN ou au référent ». | Si un document n'est pas public : l'obtenir par l'établissement ou le référent |
| 2   | Programme complété             | Pour chacun des chapitres : **sous-thèmes**, **objectifs** (« l'élève sait… »), **volume horaire** et **coefficient** quand une source les donne, **liens de prérequis** vers les chapitres de 4e, 5e ou 6e. Chaque champ renvoie à sa source. L'ordre et les titres sont corrigés si les sources le demandent, l'écart étant signalé. Contrôles : `pnpm pack:sql`, tests de base, `pnpm controler`.                                           | —                                                                              |
| 3   | Fiche de relecture du référent | Une fiche par chapitre : ce que dit la source, ce qui est proposé, ce qui manque, la case « conforme / à corriger ». Elle est reliée au kit du référent et sert d'exercice réel après la séance de prise en main.                                                                                                                                                                                                                              | Relecture                                                                      |
| 4   | Passages réels des agents      | Repris des jalons précédents : dès que la clé, la relecture des skills et l'accord sont là.                                                                                                                                                                                                                                                                                                                                                    | Clé API ; accord sur chaque coût                                               |
| 5   | Bilan                          | Bilan comme aux jalons précédents, avec captures du chapitre à relire, désormais complet.                                                                                                                                                                                                                                                                                                                                                      | —                                                                              |

L'étape 4 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-11-03)

1. **Piste retenue** : programme du pilote complet.
2. **Écartés pour ce jalon** :
   - la preuve d'exportabilité ;
   - une nouvelle matière de 3e ;
   - la pause.

## Hors Jalon 21

- La validation du programme : elle revient au référent.
- Les autres niveaux et matières : on part de la 3e du pilote ; la méthode servira ensuite.
- Le contenu des leçons, des scripts et des quiz : ils sont rédigés par les agents à partir du programme validé, puis validés par le référent.
