# Plan du Jalon 23 — remise en ordre

**Statut** : validé par le propriétaire le 2026-11-11 (piste choisie, ADR 0115). Étape 1 faite : liste d'attentes par urgence, avec qui et temps indicatif, même ordre dans la plateforme (ADR 0116). Étape 2 faite : `memory.md` court, historique dans `docs/historique.md` (ADR 0117). Étape 3 faite : README en porte d'entrée, documents corrigés, deux archives datées, `pnpm verifier:liens` dans le contrôle rapide (ADR 0118).

**Objectif** : rien de technique ne bloque plus le pilote ; ce qui reste dépend du propriétaire et de personnes extérieures (curriculum, juriste, clé API, référent, réglages GitHub). Après 22 jalons, les documents se sont empilés :

- **`memory.md` fait 300 lignes.** Son paragraphe « Prochaine étape » répète les mêmes attentes depuis dix jalons.
- **« Ce qui vous attend » date du Jalon 15.**
- **Le `README.md` du dépôt dit encore « squelette, aucun code applicatif ».**

Le Jalon 23 rend tout cela juste, court et sans doublon, pour que le propriétaire sache en une page quoi faire, dans quel ordre, avec qui.

**Règles** :

- Pas de nouvelle fonction.
- Rien n'est perdu : ce qui est retiré d'un document est déplacé, pas effacé (l'historique git reste).
- Les bilans des jalons ne sont pas réécrits : ce sont des archives datées.

## Étapes (dans cet ordre)

| #   | Étape                      | Contenu                                                                                                                                                                                                                                                                                                                                                                      | Besoin du propriétaire           |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 0   | Plan                       | Ce plan, l'ADR 0115 et `memory.md`.                                                                                                                                                                                                                                                                                                                                          | Validation (faite)               |
| 1   | Une seule liste d'attentes | `docs/attentes-proprietaire.md` mis à jour (Jalons 16 à 22 compris) et réordonné **par urgence**. Pour chaque point : qui le fait, combien de temps il prend, ce qu'il débloque. La page « Ce qui vous attend » suit la même liste (test existant). Les doublons sont retirés de `memory.md`, du guide de mise en route et des pages du pilote, qui renvoient à cette liste. | —                                |
| 2   | `memory.md` court          | Réécrit en une page de travail : état actuel, décisions en vigueur, pièges connus, prochaine étape. Le journal détaillé des jalons est déplacé tel quel dans `docs/historique.md`.                                                                                                                                                                                           | —                                |
| 3   | Documents périmés et liens | Relevé de chaque document de `docs/` et des README : encore juste ? Correction, ou mention « archive » datée. `README.md` du dépôt réécrit en porte d'entrée (que lire, selon qu'on est propriétaire, référent ou développeur). **Un contrôle automatique des liens internes** (fichiers et ancres Markdown) est ajouté au contrôle rapide.                                  | —                                |
| 4   | Passages réels des agents  | Repris des jalons précédents : dès que la clé, la relecture des skills et l'accord sont là.                                                                                                                                                                                                                                                                                  | Clé API ; accord sur chaque coût |
| 5   | Bilan                      | Bilan court, sans captures sauf si un écran change.                                                                                                                                                                                                                                                                                                                          | —                                |

L'étape 4 s'insère dès que la clé arrive. Les étapes 2 et 3 du Jalon 21 reprennent dès que le curriculum arrive.

## Décisions du propriétaire (2026-11-11)

1. **Piste retenue** : remise en ordre.
2. **Écartés pour ce jalon** :
   - la revue de sécurité du code ;
   - l'accessibilité ;
   - la pause.

## Hors Jalon 23

- Les heures du journal de l'administration à l'heure du pays : question facultative posée au bilan du Jalon 22, en attente de réponse.
