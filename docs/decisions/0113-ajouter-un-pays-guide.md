# 0113 — « Ajouter un pays » guidé : modèle complet, `pack:nouveau`, `pack:verifier`

- **Date** : 2026-11-10 · **Statut** : appliqué (Jalon 22, étape 3)

## Contexte

Ajouter un pays tenait en trois lignes : « copier `_modele/` ». Or le modèle était presque vide (des commentaires seulement), et rien ne disait ce qui manquait. L'étape 2 l'a montré : une unité avec un programme mais sans réglages d'agents passait l'import, puis le référent tombait sur une erreur du serveur (ADR 0112).

## Décision

1. **Modèle complet** (`referentiels/_modele/`) : chaque fichier porte toutes ses clés, vides ou à `null`, avec un commentaire qui dit quoi y mettre. Les marqueurs `{{CODE_PAYS}}` et `{{NOM_PAYS}}` sont remplacés à la création. `SOURCES.md` a une ligne « manquant » par fichier.
2. **Gabarits** (`_modele/gabarits/`) : un programme, et les réglages de chaque agent (par unité, par pays, par famille). Ils ont exactement les variables des prompts, hors valeurs calculées à l'exécution ; un test le vérifie.
3. **`pnpm pack:nouveau <dossier> <code> "<nom>"`** : copie le modèle sans ses gabarits. Elle pose le code et le nom du pays, refuse d'écraser un dossier existant, puis affiche le rapport.
4. **`pnpm pack:verifier <dossier>`** (lecture seule) classe chaque point en trois niveaux :
   - **bloquant** : l'import serait refusé ;
   - **à compléter** : agents du pays et des familles, variables vides, FAQ, unités sans programme, indicatifs, sources ;
   - **à valider** : décisions humaines (programmes, majorité, durées de conservation, seuils du pilote, FAQ, questionnaire, recrutement).

   Elle sort en erreur s'il reste un point bloquant.

5. **Guide** pas à pas dans `referentiels/README.md` (« Ajouter un pays », 10 étapes).

## Défauts révélés et corrigés

- Le `questionnaire.yaml` du modèle (version vide) bloquait l'import d'un pack neuf : il porte désormais une version.
- Le `SOURCES.md` du pays Z n'avait qu'une ligne « tous les fichiers » : une ligne par fichier, comme le demande la règle du projet.

## Conséquences

- Un test crée un pays fictif « qq » depuis le modèle. Il le remplit au minimum avec les gabarits, vérifie qu'il ne reste rien de bloquant, puis génère son SQL d'import. L'import réel de ce SQL n'est pas rejoué en base : il passe par le même générateur que les packs du Gabon et du pays Z, importés par les tests de base.
- Les rapports du Gabon et du pays Z n'ont aucun point bloquant.
- Le rapport du Gabon sert de liste de travail au propriétaire et au référent : 55 unités sur 67 sans programme, 12 programmes à valider, âge de la majorité, durées, budget.
