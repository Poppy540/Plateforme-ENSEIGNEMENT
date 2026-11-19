# 0022 — Agent Scénariste : une génération structurée, lancée par le référent

- **Date** : 2026-10-04 · **Statut** : technique, conforme au cadrage (prompt C1, §5.2) · construit sans clé API (modèle simulé)

## Décision

1. **Pas de conversation** : un script = **un appel** au modèle, avec le prompt C1 inchangé (+ valeurs du pack pays + règles communes §5.1 + skills `contenu-non-fiable`, `script-pense-a-voix-haute`, `ancrage-local`).
2. **Sortie imposée par schéma JSON** (sorties structurées de l'API) : décision (`script` ou `refus`), message au référent, mention « à relire en priorité » et son motif, sections typées selon les huit étapes de la méthode (accroche, objectifs, prérequis, explication, pause, exemple résolu, erreurs fréquentes, résumé) avec minutage, texte parlé et indications visuelles, travaux pratiques, idées de questions, glossaire, points [À VÉRIFIER], exemples locaux à valider, signalements sur le programme. La sortie est relue et vérifiée par le serveur : sortie tronquée, illisible ou refus du modèle → rien n'est enregistré.
3. **Métadonnées hors du modèle** : unité, chapitre, version et statut viennent du serveur et de la base (statut « brouillon » imposé, ADR 0021). Le modèle ne peut ni valider ni publier : il n'a aucun outil et son rôle de base n'a aucun droit de validation.
4. **Lancement par l'enseignant-référent** depuis la page d'un chapitre validé de sa famille : durée cible (2 à 30 minutes) et consigne facultative (1 000 caractères au plus, isolée dans la demande). Limite de coût : 3 brouillons par chapitre et par jour.
5. **Modèle** : `claude-opus-5-5`, effort `high` (rédaction longue et soignée), 64 000 jetons de sortie au plus, en flux ; repli côté serveur activé en cas de refus de sécurité ; prompt système mis en cache. Variables : `MODELE_SCENARISTE`, `EFFORT_SCENARISTE`, `MAX_JETONS_SCENARISTE`.
6. **Relecture** : page de lecture du script dans l'espace référent (points [À VÉRIFIER] surlignés, mention prioritaire en tête). La validation et le rejet des scripts sont l'étape 3 du Jalon 2.
7. **Tests** : batteries TC + SC exécutées par le lanceur commun (`pnpm test:agents --agent scenariste`), entrées concrètes dans `agents/scenariste/tests/entrees.yaml` (à relire), contrôles automatiques propres au format. TC-09 (détresse d'un élève) est non applicable. Estimation d'un passage réel complet : ~25 USD (≈ 0,30 USD par script) ; mini-essai SC-01 × 1 : ~0,33 USD.

## Valeurs provisoires

`referentiels/gabon/agents/scenariste/ga-3e-mathematiques.yaml` reprend les valeurs de l'unité pilote ; persona et référent restent provisoires, à valider par le propriétaire.
