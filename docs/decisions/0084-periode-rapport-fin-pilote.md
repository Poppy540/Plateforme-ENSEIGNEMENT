# 0084 — Période du pilote et rapport de fin

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 14, étape 1).

## Contexte

La procédure du pilote (`docs/pilote/procedure.md`, « Après ») prévoit un rapport de pilote. Ce rapport ne contient que des indicateurs agrégés, des retours, des incidents et des décisions, sans aucune donnée nominative. Le rapport hebdomadaire (ADR 0082) couvre une semaine. Rien ne couvrait tout le pilote, et ses dates n'étaient notées nulle part.

## Décision

1. **Période du pilote** : premier et dernier jour, saisis sur la page « Rapport de fin de pilote ». Le dernier jour reste vide tant que le pilote est en cours ; le rapport s'arrête alors à aujourd'hui.
   - La période est corrigeable et ne dépasse pas un an.
   - Elle est enregistrée dans `periode_pilote`, une seule ligne illisible directement.
   - Chaque saisie est tracée (`periode_pilote` au journal d'audit).
2. **Rapport de fin** (`/administration/fin-pilote`) :
   - les 5 questions du retour d'expérience, avec une colonne « Total » sur toute la période, puis une colonne par semaine (« Sem. 1 »…) ;
   - les semaines partent du premier jour et durent 7 jours ; la dernière s'arrête au dernier jour, et leurs dates sont rappelées.

   Le total n'est pas la somme des semaines pour les personnes : « Élèves actifs sur la période » compte chaque élève une fois.

3. **Mêmes indicateurs et mêmes règles que le rapport de la semaine** : les indicateurs sont définis une seule fois (`indicateurs(version, periode)` dans `src/lib/pilote/semaine.ts`) et repris par les deux rapports. La règle de diffusion reste « <5 » ; pas de moyenne sous 5 quiz, pas de coût par élève sous 5 élèves actifs.
4. **Questionnaire anonyme**, dans les deux versions : groupe par groupe, avec les mêmes règles que l'export existant (ADR 0052). Un groupe de moins de 5 réponses n'est pas montré ; une case de 1 à 4 réponses s'affiche « <5 ».
5. **Version équipe** : s'ajoutent les critères de suspension signalés pendant le pilote, c'est-à-dire les alertes de l'Orchestrateur dans la file humaine, dont le résumé ne porte jamais d'élève. S'ajoutent aussi les décisions du journal du pilote ; une reprise y est résumée par sa cause et sa correction.
6. **Version établissement** : usage, aide, signalements reçus et traités, questionnaire. Ni coûts, ni détail des agents, ni charge de l'équipe, ni critères, ni journal.
7. **Impression et texte** : la page s'imprime, et `GET /api/administration/fin-pilote?version=` renvoie un fichier Markdown, réservé à l'administration. Ce fichier sert de base au rapport de `docs/bilans/` et à la réunion de bilan.
8. **Base** (migration 0044) :
   - `chiffres_periode_interne(debut, fin)`, sans droit d'exécution, porte le calcul. `semaine_pilote` (ADR 0082) devient un simple appel à cette fonction, avec les mêmes colonnes ;
   - fonctions d'administration : `chiffres_periode` (366 jours au plus), `periode_pilote_lire`, `definir_periode_pilote` et `alertes_criteres_periode`.

   Le serveur calcule toutes les semaines dans une seule transaction, l'une après l'autre, pour ne pas occuper le réservoir de connexions.

## Tests

- Base : FP01 (administration seulement, fonction interne fermée), FP02 (période contrôlée, corrigeable, tracée) et FP03 (mêmes chiffres que le rapport de la semaine ; alertes de critères de la période seulement).
- Unitaires : découpage en semaines (jusqu'à 53), colonnes et masquage, version établissement, questionnaire masqué, texte Markdown.
- Bout en bout : période refusée puis saisie, pilote en cours sur 3 semaines, en-têtes du tableau, téléchargement sans numéro ni identifiant, version établissement, refus sans session, accessibilité.
