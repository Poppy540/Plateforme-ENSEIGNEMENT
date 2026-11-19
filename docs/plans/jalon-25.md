# Plan du Jalon 25 — fusion de la branche de travail dans `main`

**Statut** : validé par le propriétaire le 2026-11-19 (piste choisie, ADR 0122). Étape 1 faite : Next.js 16.4.6 (le paquet refusait de se construire en 16.4.3, deux failles modérées), contrôle complet 11 / 11 sur copie propre, demande de fusion [Poppy540/Plateforme-ENSEIGNEMENT#2](https://github.com/Poppy540/Plateforme-ENSEIGNEMENT/pull/2) ouverte et suivie. Étape 2 faite de mon côté : CodeQL relevait 5 alertes élevées anciennes (jamais analysées sur `main`) puis 1 sur la première correction ; toutes corrigées ; contrôles verts, aucun conflit, aucun fil ouvert. Fusionnée par le propriétaire le 2026-11-19 (`91c1835`). Étape 3 : sur `main`, Dependabot a lancé ses recherches de mises à jour, CodeQL et le contrôle tournent ; `pnpm verifier:depot` : SECURITY.md, Dependabot et CodeQL configurés sur `main`, restent 3 réglages du propriétaire (signalement privé, mises à jour de sécurité Dependabot, protection de `main`) ; branche de travail repartie de `main` ; point « GitHub » de la liste d'attentes mis à jour. Étape 5 faite : [bilan](../bilans/jalon-25.md). L'étape 4 attend la clé.

**Objectif** : tout le travail des Jalons 1 à 24 est sur la branche `claude/gabon-education-platform-ldrr4p`. La branche principale `main` est restée au début du projet : 179 commits de retard, aucun commit qu'elle serait seule à avoir, donc aucun conflit attendu. Tant que la fusion n'est pas faite :

- `SECURITY.md` n'apparaît pas comme politique de sécurité du dépôt ;
- Dependabot ne propose ses mises à jour que pour `main`, donc pour un code ancien ;
- CodeQL n'analyse pas la branche que GitHub montre par défaut ;
- quiconque ouvre le dépôt public voit un squelette périmé.

**Règles** :

- **Seul le propriétaire fusionne.** Claude Code ouvre la demande de fusion, la surveille et corrige ce que GitHub signale, sans jamais fusionner, approuver ni réécrire l'historique.
- Aucune modification de fond pendant la demande : seulement ce que les contrôles ou les relectures exigent.

## Étapes (dans cet ordre)

| #   | Étape                     | Contenu                                                                                                                                                                                                                                                                                                                                            | Besoin du propriétaire               |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 0   | Plan                      | Ce plan, l'ADR 0122 et `memory.md`.                                                                                                                                                                                                                                                                                                                | Validation (faite)                   |
| 1   | Demande de fusion         | Vérifier une dernière fois : contrôle complet réussi sur la copie propre du dernier commit, aucun secret ni donnée réelle (revue du Jalon 24). Ouvrir la demande de fusion vers `main`, avec un résumé lisible des 24 jalons, des liens vers les bilans et ce que la fusion active sur GitHub. S'abonner à ses événements (contrôles, relectures). | —                                    |
| 2   | Suivi jusqu'au vert       | Corriger et pousser tout ce que les contrôles ou les relectures automatiques signalent ; répondre à chaque remarque. Dire clairement quand la demande est prête.                                                                                                                                                                                   | Relire, puis **fusionner vous-même** |
| 3   | Après la fusion           | Vérifier sur `main` : contrôle de GitHub vert, CodeQL et Dependabot actifs, `SECURITY.md` reconnu ; `pnpm verifier:depot` ; mettre à jour la liste d'attentes (point « GitHub »).                                                                                                                                                                  | Les réglages GitHub restants         |
| 4   | Passages réels des agents | Repris des jalons précédents : dès que la clé, la relecture des skills et l'accord sont là.                                                                                                                                                                                                                                                        | Clé API ; accord sur chaque coût     |
| 5   | Bilan                     | Bilan court.                                                                                                                                                                                                                                                                                                                                       | —                                    |

## Décisions du propriétaire (2026-11-19)

1. **Piste retenue** : fusion dans `main`.
2. **Écartés pour ce jalon** :
   - les textes et les heures du pays ;
   - l'accessibilité revue ;
   - la pause.

## Après la fusion

Le travail continue sur la branche de travail, repartie de `main`. Une nouvelle demande de fusion est ouverte quand le propriétaire le demande.
