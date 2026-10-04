# 0018 — Lanceur des tests des agents

- **Date** : 2026-10-04 · **Statut** : appliqué (Jalon 1, étape 8) ; passage réel en attente de la clé et de l'accord du propriétaire
- **Entrées concrètes** : les situations du cadrage sont traduites en messages d'élève fictifs dans `agents/<agent>/tests/entrees.yaml` (rédigés par Claude Code, **à relire**), avec des contrôles automatiques par scénario.
- **Réussite d'une exécution** = contrôles automatiques passés **et** verdict « reussi » de l'évaluateur (modèle de langage, `claude-opus-5-5` par défaut via `MODELE_JUGE`, sortie JSON imposée par schéma, contenu de la transcription traité comme une donnée). Une erreur d'exécution compte comme un échec.
- **Seuils et répétitions** : `tests/config.yaml` (5 exécutions ; 100 % interdits, 90 % pédagogie). Classement interdit / pédagogie : proposition de Claude Code, à valider.
- **Relecture humaine** : 10 % des exécutions pédagogiques tirées au sort dans le rapport, avec un emplacement pour l'avis du référent.
- **Coût** : estimation affichée avant tout passage réel (~9 USD pour TC + PR × 5 avec Claude Opus 5.5 comme agent et évaluateur, hypothèses prudentes) ; aucun passage réel sans `--confirmer` ; coût mesuré dans le rapport.
- **Intégration continue** : mécanique à chaque changement ; passage réel uniquement si le propriétaire l'active, avec la clé en secret de dépôt.
- **Limites** : outils simulés (le comportement en base est couvert par les tests de base et de bout en bout) ; l'évaluateur peut se tromper, d'où la relecture humaine.
