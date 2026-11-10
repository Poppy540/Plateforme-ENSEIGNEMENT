# Plan du Jalon 22 — exportabilité à jour

**Statut** : validé par le propriétaire le 2026-11-09 (piste choisie, ADR 0110). Étape 1 faite : [inventaire](../portabilite/inventaire-jalon-22.md), ADR 0111 (le mot du pays pour les séries vient du pack). Étape 2 faite : journée d'ouverture du pays Z et étanchéité entre pays (ADR 0112, `journee-pays-z.spec.ts`). Étape 3 faite : modèle complet, gabarits, `pnpm pack:nouveau`, `pnpm pack:verifier`, guide pas à pas (ADR 0113).

**Objectif** : le pack fictif `zz-fictif` (ADR 0041) a prouvé au Jalon 4 qu'un second pays s'ajoute sans modifier le code. Depuis, dix-sept jalons ont ajouté beaucoup de choses :

- classes et capacité ;
- enseignant de la classe ;
- chapitres du pilote et kit du référent ;
- tableau de bord du pilote et « Ce qui vous attend » ;
- hors ligne étendu ;
- curriculum par compétences.

Le portage n'a été vérifié que sur l'aide, l'inscription, le catalogue, le Professeur et le recrutement. Le Jalon 22 vérifie que **tout** ce qui a été construit depuis marche encore pour un autre pays. Il fait aussi d'« Ajouter un pays » une procédure guidée et contrôlée, pas seulement trois lignes du `referentiels/README.md`.

**Règles** :

- Données fictives seulement : pays `zz`, numéros `+999`.
- Rien de propre à un pays dans le code : le test de garde reste la règle.
- Ce qui ne marche pas pour le pays Z est corrigé **de façon générique**, jamais par un cas particulier.
- Le pack du Gabon n'est pas modifié, sauf un défaut révélé, signalé.

## Étapes (dans cet ordre)

| #   | Étape                         | Contenu                                                                                                                                                                                                                                                                                                                                                                                     | Besoin du propriétaire           |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 0   | Plan                          | Ce plan, l'ADR 0110 et `memory.md`.                                                                                                                                                                                                                                                                                                                                                         | Validation (faite)               |
| 1   | Inventaire                    | Relevé de tout ce qui, depuis le Jalon 4, lit une valeur d'un pays : pages, textes affichés, fonctions SQL, documents du pilote, attentes. Pour chacun : vient-il du pack, ou suppose-t-il le Gabon ? Le test de garde est étendu aux mots trouvés (par exemple les noms d'examens ou de classes). Les écarts sont corrigés de façon générique ; ce qui ne peut pas l'être est consigné.    | —                                |
| 2   | Journée d'ouverture du pays Z | La répétition de la journée d'ouverture (Jalon 19), rejouée de bout en bout pour le pays Z, sur téléphone simulé : classe d'une « Année » du pack avec sa capacité, enseignant, référent de sa famille, chapitres du pilote, élèves (majorité à 16 ans du pack), quiz, plan, hors ligne, tableau de bord. Un compte du Gabon ne voit rien du pays Z, et l'inverse.                          | —                                |
| 3   | « Ajouter un pays » guidé     | Une commande `pnpm pack:nouveau <code>` copie `_modele/` et liste ce qui reste à remplir. Une commande `pnpm pack:verifier <dossier>` dit, fichier par fichier, ce qui est complet, « à valider » ou manquant, avec sa source dans `SOURCES.md`. Un test crée un pays fictif depuis le modèle, le remplit au minimum et l'importe. Le guide `referentiels/README.md` est réécrit pas à pas. | —                                |
| 4   | Paquet par pays               | `pnpm paquet` choisit les packs à embarquer (`--pays gabon` par exemple). `verifier:production` dit quels pays sont importés en base et refuse un pack de test. La répétition générale du déploiement le vérifie.                                                                                                                                                                           | —                                |
| 5   | Passages réels des agents     | Repris des jalons précédents : dès que la clé, la relecture des skills et l'accord sont là.                                                                                                                                                                                                                                                                                                 | Clé API ; accord sur chaque coût |
| 6   | Bilan                         | Bilan comme aux jalons précédents, avec captures du pays Z.                                                                                                                                                                                                                                                                                                                                 | —                                |

L'étape 5 s'insère dès que la clé arrive. Les étapes 2 et 3 du Jalon 21 reprennent dès que le curriculum arrive, avant ou pendant ce jalon.

## Décisions du propriétaire (2026-11-09)

1. **Piste retenue** : exportabilité, en attendant le curriculum de Mathématiques 3e.
2. **Écartés pour ce jalon** :
   - la remise en ordre de `memory.md` et des attentes ;
   - une nouvelle matière de 3e ;
   - la pause.

## Hors Jalon 22

- Un vrai second pays : il demande des sources officielles et une équipe locale (processus du cadrage).
- La traduction de l'interface dans une autre langue que le français.
