# 0112 — Journée d'ouverture rejouée pour le pays fictif Z

- **Date** : 2026-11-10 · **Statut** : appliqué (Jalon 22, étape 2)

## Contexte

La journée d'ouverture du pilote (ADR 0102) n'était répétée que pour le Gabon. La preuve de portabilité du Jalon 4 (ADR 0041) ne couvrait ni les classes, ni l'enseignant, ni le référent, ni le hors ligne, ni le tableau de bord.

## Décision

Le test `tests/bout-en-bout/journee-pays-z.spec.ts` rejoue les mêmes gestes avec le pack `zz-fictif` (classe d'« Année 2 », chapitre « Proportions et échelles (pays Z) », qu'aucun autre test n'utilise), sans une ligne de code propre à ce pays :

1. **La veille** :
   - l'administration crée une classe d'« Année 2 » de capacité 10, dans le formulaire du pays Z (« Option », exemple « Année 1 A ») ;
   - l'enseignant active son accès ;
   - un référent invité pour le pays Z valide un chapitre et son quiz.
2. **Le jour J** : 10 élèves mineurs s'inscrivent (accord du parent), rejoignent la classe, ouvrent le chapitre et font le quiz, 5 à la fois.
3. Un 11e trouve la classe pleine ; l'administration est alertée et son tableau de bord s'affiche.
4. Un élève relit sans réseau « Mes cours », l'unité et son plan.
5. **Le soir** : l'enseignant voit ses chiffres d'ensemble, sans aucun nom.
6. **Étanchéité, vérifiée dans les deux sens** :
   - le référent du pays Z ne voit que ses chapitres (un chapitre du Gabon : 404) ;
   - un élève du Gabon ne peut pas rejoindre la classe du pays Z, ni ouvrir ses cours (404), ni lire sa FAQ ;
   - un élève du pays Z n'ouvre pas une unité du Gabon (404).

Les outils de test `inscrireEleveActif` et `creerInvitationFictive` prennent un référentiel (le Gabon par défaut).

## Écarts révélés et corrigés

1. **Une unité avec un programme mais sans réglages d'agents.** Le pack du pays Z n'avait les réglages des agents (Professeur, Scénariste, Évaluateur, Production vidéo) que pour l'« Année 3 ». Le référent qui demandait un quiz en « Année 2 » tombait sur une erreur du serveur. Corrections :
   - le pack du pays Z est complété ;
   - **l'import d'un pack (`pnpm pack:sql`) refuse désormais toute unité qui a un programme sans les réglages de ses quatre agents** (`src/lib/pack-pays/agents-des-unites.ts`), en listant les fichiers manquants ;
   - le pack de test des tests de base (`tests/packs/yy-fictif`) reçoit des réglages minimaux.

   Le pack du Gabon était déjà complet (12 unités sur 12).

2. **Tests qui se marchent dessus** : une première version utilisait le 3e chapitre de l'« Année 3 » ; le test de portabilité du Jalon 4 compte justement 2 chapitres visibles sur 3. Le contrôle complet l'a vu ; la journée du pays Z utilise désormais l'« Année 2 ».

## Conséquences

- Le test tourne dans `pnpm controler` et sur GitHub Actions, comme les autres.
