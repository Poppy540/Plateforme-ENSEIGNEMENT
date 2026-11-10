# 0112 — Journée d'ouverture rejouée pour le pays fictif Z

- **Date** : 2026-11-10 · **Statut** : appliqué (Jalon 22, étape 2)

## Contexte

La journée d'ouverture du pilote (ADR 0102) n'était répétée que pour le Gabon. La preuve de portabilité du Jalon 4 (ADR 0041) ne couvrait ni les classes, ni l'enseignant, ni le référent, ni le hors ligne, ni le tableau de bord.

## Décision

Le test `tests/bout-en-bout/journee-pays-z.spec.ts` rejoue les mêmes gestes avec le pack `zz-fictif`, sans une ligne de code propre à ce pays :

1. **La veille** :
   - l'administration crée une classe d'« Année 3 » de capacité 10, dans le formulaire du pays Z (« Option », exemple « Année 1 A ») ;
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

## Conséquences

- Aucun écart nouveau n'est apparu : les corrections de l'étape 1 (ADR 0111) suffisent.
- Le test tourne dans `pnpm controler` et sur GitHub Actions, comme les autres.
