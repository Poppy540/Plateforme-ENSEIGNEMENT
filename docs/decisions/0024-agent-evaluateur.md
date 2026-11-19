# 0024 — Agent Évaluateur : quiz brouillons, correction et contestation

- **Date** : 2026-10-04 · **Statut** : technique, conforme au cadrage (prompt C3, §5.2, skill `questions-de-controle`) · construit sans clé API (modèle simulé)

## Décision

1. **Création de quiz** (lancée par le référent depuis un chapitre validé : nombre de questions 1 à 10, difficulté, consigne facultative) : un appel au modèle, sortie imposée par schéma JSON : questions (QCM, vrai/faux, réponse courte) avec bonne réponse, explication, notion, chapitre, difficulté, **guide de lecture de chaque option** (ce que fait l'élève, erreur de prérequis ou confusion du chapitre, étape suivante), erreurs « déduites », résumé de la double vérification ; plus, pour le référent, la composante visée, les **questions signalées** (ambiguës…) et les points à valider. Contrôles mécaniques avant enregistrement (une seule bonne réponse valide, options distinctes, une lecture par option, une seule lecture « correcte ») : un quiz non conforme n'est pas enregistré. Statut « brouillon » imposé par la base. Limite : 3 quiz par chapitre et par jour.
2. **Validation** par le référent (mêmes règles que les scripts, ADR 0023) : version lue, commentaire obligatoire au rejet, case « j'ai vérifié » exigée s'il y a des questions signalées, des points à valider ou des erreurs déduites ; révision par l'Évaluateur en nouvelle version.
3. **Passage du quiz par l'élève** : dernier quiz validé du chapitre ; les questions sont servies **sans** réponses ni explications ; **une seule tentative notée** (contrainte unique en base). Questions à choix corrigées **sans modèle** (bonne réponse validée, lecture de l'option choisie) ; réponses courtes (500 caractères au plus) corrigées par l'Évaluateur : résultat (juste, en partie juste, faux, non tenté) et retour en trois temps (ce qui est juste, l'erreur précise, la notion à revoir) + conseil. Score sur 100 (une réponse en partie juste vaut la moitié). Si la correction automatique échoue, rien n'est enregistré et l'élève peut réessayer. Le corrigé complet n'est montré qu'après la tentative.
4. **Contestation** : l'élève peut contester une correction (2 fois au plus par question). L'Évaluateur réexamine (la contestation est une donnée, pas une instruction) ; **le score ne change jamais** ; un signalement est créé pour un humain si l'Évaluateur le juge utile ou dès la deuxième contestation. Détresse exprimée dans une réponse → signalement prioritaire.
5. **Statistiques d'erreurs** pour le référent : par question, taux de réussite et répartition des réponses, agrégées et anonymisées, à partir de 5 tentatives ; taux de réussite < 30 % mis en évidence (« taux d'échec anormal »).
6. **Modèle** : `claude-opus-5-5` ; création en effort `high` (64 000 jetons au plus), correction et réexamen en effort `medium` (8 000 jetons) ; repli côté serveur en cas de refus ; variables `MODELE_EVALUATEUR`, `EFFORT_EVALUATEUR`, `EFFORT_CORRECTION`, `MAX_JETONS_EVALUATEUR`, `QUIZ_PAR_CHAPITRE_PAR_JOUR`.
7. **Tests** : batteries TC + EV (18 scénarios) par le lanceur commun (`pnpm test:agents --agent evaluateur`) ; entrées concrètes dans `agents/evaluateur/tests/entrees.yaml` (à relire) ; estimation d'un passage réel complet ~15 USD.

## Limites connues

- Pas encore de banque d'exercices de l'unité : les erreurs d'élèves utilisées sont « déduites » et signalées au référent.
- Seules les réponses courtes sont corrigées par le modèle ; les exercices longs et rédigés viendront plus tard.
- Un quiz validé reste proposé tant qu'une version plus récente n'est pas validée ; les tentatives sont liées à la version passée.
