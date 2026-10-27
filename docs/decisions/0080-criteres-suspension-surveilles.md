# 0080 — Critères de suspension du pilote surveillés

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 13, étape 1).

## Contexte

`docs/pilote/criteres-arret.md` liste quand suspendre ou arrêter le pilote. Une fois le pilote lancé, il faudrait croiser à la main la file humaine, les coûts et les contestations de quiz pour savoir si un critère est atteint. Le risque : voir trop tard une détresse restée sans réponse, ou une erreur de contenu oubliée.

## Décision

1. **Page `/administration/criteres`** : les 12 critères du document, rangés en trois niveaux. Chaque critère a un état écrit en toutes lettres : « Rien à signaler », « À examiner », « Atteint » ou « Non surveillé ».

   | Niveau                        | Ce qu'il signifie                                  |
   | ----------------------------- | -------------------------------------------------- |
   | Suspension immédiate          | « Atteint » : suspendre d'abord, analyser ensuite. |
   | Examen au point de la semaine | « À examiner » : décider au point hebdomadaire.    |
   | Arrêt du pilote               | « Atteint » : le pilote s'arrête.                  |

   L'en-tête donne la synthèse : critères atteints, critères à examiner, critères non surveillés. Un encadré « Mesures en cours » montre l'accès des élèves et les agents suspendus. Les boutons de suspension existants restent sur `/administration` (ADR 0034).

2. **Quatre critères calculés** par la base, en nombres seulement :
   - **détresse** non prise en charge : « à examiner » au-delà de `detresse_delai_heures`, « atteint » au-delà de `detresse_delai_max_heures` ;
   - **erreur de contenu** signalée et non traitée au-delà de `erreur_contenu_delai_jours` : « à examiner » ;
   - **contestations** sur une même question de quiz en 7 jours, au-delà de `contestations_max_par_question` : « à examiner ». La base ne sait pas si une contestation est justifiée, et la page le dit ;
   - **coût** des 7 derniers jours au-delà du budget plus `depassement_budget_pourcent` : « à examiner ».
3. **Huit critères déclarés** par le propriétaire, avec un motif de 3 à 300 caractères dont les coordonnées sont masquées :
   - contenu dangereux ;
   - fuite de données ;
   - contenu non validé montré ;
   - demande de l'établissement ;
   - sortie de périmètre ;
   - équipe indisponible ;
   - retrait de l'accord ;
   - suspensions répétées.

   Un critère déclaré se lève avec un motif. Déclarations et levées sont tracées dans le journal d'audit. La base refuse de déclarer un critère calculé.

4. **Seuils dans le pack pays** : section `pilote` de `pays.yaml`, au statut « à valider » dans `SOURCES.md`, contrôlée par la lecture du pack.
   - Valeurs proposées pour le Gabon : 2 h et 12 h (d'après la procédure de détresse), 7 jours, 2 contestations, 50 %.
   - Le **budget hebdomadaire reste vide** : c'est au propriétaire de le fixer.
   - Un seuil vide rend son critère « non surveillé », et la page dit lequel fixer.
   - Les seuils sont ceux des pays des chapitres du pilote. Si le pilote couvre plusieurs pays, le plus prudent de chaque seuil s'applique. Sans chapitre du pilote, aucun critère calculé n'est surveillé.
5. **Alerte dans la file humaine** : l'exécuteur planifié évalue les critères calculés à chaque passage.
   - Il ajoute **une** alerte par épisode : priorité 1 si le critère est atteint, 2 s'il est à examiner. L'alerte est un résumé sans élève, et l'épisode est noté dans `alertes_criteres`.
   - Un critère redevenu calme est oublié : un nouvel épisode sera de nouveau signalé. Le passage de « à examiner » à « atteint » est un nouvel épisode.
   - En priorité 1, la veille est prévenue comme pour une détresse.
6. **La plateforme signale, le propriétaire décide** : rien ici ne suspend. Seule la suspension d'un agent au coût anormal (ADR 0046) reste automatique.
7. **Base** (migration 0041) :
   - tables `criteres_declares` et `alertes_criteres`, illisibles directement ;
   - fonctions de l'administration : `faits_criteres_pilote`, `pays_du_pilote`, `declarer_critere`, `lever_critere`, `criteres_declares_liste` ;
   - fonctions de l'Orchestrateur seul : `faits_criteres_orchestrateur`, `pays_du_pilote_orchestrateur`, `alerter_criteres_pilote`.

   Toutes reposent sur des fonctions internes sans droit d'exécution.

## Écarts avec le plan

« Agent suspendu » et « accès des élèves fermé » ne sont pas des critères, mais des mesures déjà prises. Ils apparaissent dans l'encadré « Mesures en cours ». « Deux suspensions immédiates pour la même cause » était déclaré ; il se calcule depuis le journal du pilote (ADR 0081).

## Tests

- Base : CR01 (faits, administration seulement, délais vides), CR02 (déclaration, levée, audit, critère calculé refusé) et CR03 (une alerte par épisode, sans élève, Orchestrateur seul).
- Unitaires : états et seuils, valeurs exactement au seuil, non surveillé, déclarés, plusieurs pays, lecture et contrôle des seuils du pack.
- Bout en bout : détresse de 13 h atteinte, une seule alerte pour deux passages de l'exécuteur, déclaration avec numéro masqué, levée, accessibilité.
