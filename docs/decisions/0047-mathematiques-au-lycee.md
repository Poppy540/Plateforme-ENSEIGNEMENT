# 0047 — Mathématiques au lycée (Seconde, Première et Terminale C et D) et prérequis par série

- **Date** : 2026-10-20 · **Statut** : contenus PROVISOIRES (à valider par un référent de Maths et d'après les programmes IPN) ; règle des séries technique
- **Migration** : 0028 · **Tests** : G04 (base), `mathematiques-lycee.test.ts`, `pack-pays.test.ts`, `coordinateur.test.ts` (unitaires), `maths-lycee.spec.ts` (bout en bout)

## Décision

1. **Programmes provisoires** repris mot pour mot du cadrage : Seconde (6 chapitres), Première C et D (2 chacune), Terminale C (4) et Terminale D (2). Le cadrage donne un programme continu sur deux ans ; **répartition décidée par le propriétaire (2026-10-20)** : Suites et Dérivation en Première, le reste en Terminale. Volumes et coefficients manquants. La série B (Mathématiques) reste hors de ce jalon.
2. **Graphe de prérequis** prolongé : 26 liens proposés (Seconde ← collège, Première ← Seconde, Terminale ← Première et Seconde), « à valider » lien par lien. Total : 70.
3. **Valeurs des agents** (Professeur, Scénariste, Évaluateur, fiche d'avatar) pour les 5 unités, d'après `profils-niveau.yaml` (Seconde ; cycle terminal), avec la série et l'examen. Le Coordinateur de la famille Mathématiques couvre maintenant de la 6e à la Terminale.
4. **Règle des séries**, révélée par le lycée : un prérequis propre à des séries ne vaut que pour un chapitre de ces mêmes séries ; un prérequis sans série (collège, Seconde) vaut pour tous. Elle est appliquée à quatre endroits :
   - à la lecture du pack ;
   - en base (déclencheur sur tout lien : import, décision d'un référent, proposition du Coordinateur acceptée) ;
   - dans les contrôles du serveur sur les propositions du Coordinateur ;
   - dans le **Tuteur**, qui prenait comme prérequis possibles les chapitres de toutes les séries des classes inférieures. Un élève de Terminale D pouvait ainsi se voir proposer un chapitre de Première C. Corrigé : seulement les unités sans série ou de la série de l'élève.

## Limites

- Programmes et répartition provisoires ; à valider par un référent et d'après les documents de l'IPN.
- Aucune vidéo ni quiz pour ces unités tant que les chapitres ne sont pas validés.
