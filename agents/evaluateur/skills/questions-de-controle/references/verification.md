# Double vérification — questions de contrôle

Adapté de `references/verification.md` de *K-12 Check for Understanding* (https://github.com/anthropics/k12-teacher-skills, commit `281eb8d41fe2837d911541c9bbb870b58add804c`). Copyright 2026 Anthropic, PBC · Copyright 2026 Learning Commons · SPDX-License-Identifier: Apache-2.0. Modifié : traduction ; vérification par calcul écrit indépendant au lieu d'exécuter du code (`python3 -c`), sans fichier temporaire ni sous-agent ; rattachement au guide de lecture des réponses de l'Évaluateur.

À lire **après** avoir rédigé les questions, jamais pendant : une fois qu'on sait quelle réponse on voulait, une question à deux bonnes réponses paraît juste. On relit donc le **texte écrit**, et on **écrit** chaque argument. Ces contrôles ne figurent pas dans la fiche finale.

## Contrôle A — une seule réponse défendable

Pour chaque QCM, prendre chaque option, distracteurs compris, et écrire une ligne : **le meilleur argument pour que cette option soit juste**, en n'utilisant que l'énoncé et la figure (ou sa description). « Fausse parce que ce n'est pas la bonne réponse » revient à ne pas faire le contrôle. Compter les options dont l'argument tient.

- **Une seule** → la question passe.
- **Deux ou plus** → la question est sans réponse unique, souvent parce que la bonne réponse repose sur une propriété que l'énoncé ne nomme pas. Réparer dans cet ordre : (1) nommer la propriété dans l'énoncé ; (2) retirer l'option.
- **Aucune** → soit la figure n'est pas décrite (compléter sa description et recommencer), soit la bonne réponse est fausse (reprendre la question).

Sources fréquentes d'une deuxième bonne réponse :
- **ordre des facteurs** : `a × b` et `b × a` donnent le même nombre, sauf si l'énoncé dit quel facteur compte les groupes ;
- **formes équivalentes** : `1/2`, `0,5`, `2/4`, `50 %` ; deux d'entre elles parmi les options = deux bonnes réponses ;
- **bonne conclusion, mauvaise justification** : si les options sont des phrases (« Non, car… »), plusieurs peuvent porter la bonne conclusion ; acceptable seulement si l'énoncé demande de juger la justification ;
- **arrondis, unités, précision non fixée** : une valeur juste à l'unité près est défendable face à une valeur juste au dixième si l'énoncé ne fixe pas la précision.

## Contrôle B — chaque distracteur est atteint par un raisonnement réel

L'inverse du contrôle A : l'erreur visée produit-elle vraiment cette option ? Un distracteur qu'aucun raisonnement n'atteint n'est jamais choisi, et l'élève qu'il visait atterrit ailleurs, sans ligne prévue pour lui.

1. **Calculer les grandeurs réelles de l'énoncé**, par un calcul écrit indépendant (ou l'outil de calcul autorisé s'il en existe un) : différences successives, rapports, totaux, coordonnées. Un énoncé porte souvent la propriété voulue et une autre qu'on n'a pas vue.
2. **Pour chaque ligne du guide de lecture**, appliquer l'erreur nommée à ces grandeurs et noter l'option obtenue :
   - l'option de cette ligne → passe ;
   - une autre option → échec : corriger l'option ou la ligne, puis vérifier la ligne sur laquelle l'erreur tombe ;
   - l'erreur ne s'applique pas à cet énoncé → distracteur inatteignable : le remplacer par un que l'énoncé peut produire.

Exemple d'échec : des totaux 45, 70, 95, 120 ont des différences 25, 25, 25, constantes. Un distracteur affirmant « le total n'augmente pas toujours de la même quantité » est faux pour ce tableau : un élève qui fait le test des différences choisit autre chose. L'écrire révèle l'erreur ; relire en hochant la tête, non.

Pour une réponse rédigée, le contrôle B porte sur les types de réponse du guide : chacun doit être une réponse qu'un élève pourrait réellement produire ici.

## Après les contrôles

Corriger, réécrire la question, relancer les deux contrôles sur ce qui a changé (une réparation de l'énoncé peut casser un distracteur qui marchait). Si une question échoue encore, la **remplacer** plutôt que la rafistoler. Si la solution ne peut pas être vérifiée de façon sûre, ne pas proposer la question : la signaler au référent.
