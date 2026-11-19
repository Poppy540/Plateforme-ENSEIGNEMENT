# Plan du Jalon 26 — mises à jour proposées par Dependabot

**Statut** : validé par le propriétaire le 2026-11-19 (piste choisie, ADR 0123). Étape 1 faite (ADR 0124) : actions et 8 mises à jour mineures appliquées (Playwright 1.65.0) ; dépassements de poids sur GitHub dus au préchargement des pages liées, coupé sur les trois pages chargées de liens (aucun budget relevé) ; défaut d'accessibilité corrigé ; contrôle 11 / 11, GitHub vert.

**Objectif** : depuis la fusion dans `main` (Jalon 25), Dependabot propose cinq demandes de mise à jour. Aucune n'est fusionnée.

| Demande                                                                                          | Contenu                                                        | État                                                                                    |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [Poppy540/Plateforme-ENSEIGNEMENT#3](https://github.com/Poppy540/Plateforme-ENSEIGNEMENT/pull/3) | 6 actions GitHub                                               | Verte                                                                                   |
| [Poppy540/Plateforme-ENSEIGNEMENT#4](https://github.com/Poppy540/Plateforme-ENSEIGNEMENT/pull/4) | 8 mises à jour mineures (React, Supabase, Playwright, Vitest…) | Rouge : la page des liens de prérequis du référent pèse 176 Ko pour un budget de 175 Ko |
| [Poppy540/Plateforme-ENSEIGNEMENT#5](https://github.com/Poppy540/Plateforme-ENSEIGNEMENT/pull/5) | Bibliothèque Anthropic des agents, 0.131 → 1.8 (majeure)       | Verte, mais les agents n'ont jamais fait d'appel réel                                   |
| [Poppy540/Plateforme-ENSEIGNEMENT#6](https://github.com/Poppy540/Plateforme-ENSEIGNEMENT/pull/6) | TypeScript 5 → 6 (majeure)                                     | Verte                                                                                   |
| [Poppy540/Plateforme-ENSEIGNEMENT#7](https://github.com/Poppy540/Plateforme-ENSEIGNEMENT/pull/7) | Types de Node.js 20 → 26 (majeure)                             | Verte, mais plus récente que le Node.js utilisé (22)                                    |

Le Jalon 26 les traite sur la branche de travail, chacune vérifiée, puis les amène dans `main` par une demande de fusion que le propriétaire fusionne. Une fois les versions dans `main`, Dependabot ferme de lui-même ses demandes devenues inutiles.

**Règles** :

- La règle du Jalon 20 s'applique : seulement des versions publiées depuis au moins une semaine.
- **Aucun budget de poids n'est relevé sans décision du propriétaire** : une page trop lourde est d'abord allégée.
- Aucun appel réel à l'API sans la clé et l'accord sur le coût.
- Claude Code ne fusionne aucune demande, ni la sienne ni celles de Dependabot.

## Étapes (dans cet ordre)

| #   | Étape                            | Contenu                                                                                                                                                                                                                                                                                                                                                             | Besoin du propriétaire                      |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 0   | Plan                             | Ce plan, l'ADR 0123 et `memory.md`.                                                                                                                                                                                                                                                                                                                                 | Validation (faite)                          |
| 1   | Mises à jour mineures et actions | Les 8 mises à jour mineures (n° 4) et les 6 actions (n° 3), appliquées sur la branche de travail. Mesure de ce qui alourdit la page des liens de prérequis, puis allègement (code chargé à la demande, partage avec les autres pages…). Si la page ne peut pas repasser sous 175 Ko sans perte, la question vient au propriétaire (décision D19). Contrôle complet. | D19 seulement si l'allègement ne suffit pas |
| 2   | TypeScript 6 et types de Node.js | TypeScript 6 (n° 6) : lecture des changements incompatibles, corrections éventuelles. Types de Node.js **alignés sur la version de production** (22) plutôt que 26 (n° 7), et règle Dependabot pour ne plus proposer des types plus récents que le moteur.                                                                                                          | —                                           |
| 3   | Bibliothèque Anthropic 1.x       | Lecture du guide de migration de la version 1 ; adaptation du code des agents (appels, outils, erreurs, coûts) ; tests simulés de tous les agents. Un mini-appel réel n'aura lieu qu'avec la clé et votre accord ; sinon, la mise à jour reste à confirmer à la première clé.                                                                                       | —                                           |
| 4   | Passages réels des agents        | Repris des jalons précédents : dès que la clé, la relecture des skills et l'accord sont là.                                                                                                                                                                                                                                                                         | Clé API ; accord sur chaque coût            |
| 5   | Demande de fusion et bilan       | Demande de fusion vers `main`, suivie jusqu'au vert ; bilan court.                                                                                                                                                                                                                                                                                                  | Relire, puis **fusionner vous-même**        |

L'étape 4 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-11-19)

1. **Piste retenue** : les mises à jour de Dependabot.
2. **Écartés pour ce jalon** :
   - les textes et heures du pays ;
   - l'accessibilité revue ;
   - la pause.
