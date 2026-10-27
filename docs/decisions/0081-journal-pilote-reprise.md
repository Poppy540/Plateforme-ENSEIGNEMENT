# 0081 — Journal du pilote et reprise

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 13, étape 2).

## Contexte

`docs/pilote/criteres-arret.md` exige, pour une reprise après suspension, quatre conditions : cause identifiée, correction faite et testée, accord écrit du propriétaire, établissement informé. La décision doit être notée « au journal du pilote ». Or :
- ce journal n'existait pas ;
- « Réactiver » et « Rouvrir l'accès » agissaient en un clic, sans rien exiger ;
- l'administration ne pouvait pas **suspendre** un agent elle-même, alors que le document le prévoit : seul l'Orchestrateur le faisait, sur un coût anormal.

## Décision

1. **Journal du pilote** (`journal_pilote`, page `/administration/journal`) : chaque entrée est datée, avec un texte de 3 à 500 caractères dont les numéros et emails sont masqués. Six types d'entrées :

   | Type | Origine |
   |---|---|
   | Suspension d'un agent | Volet « Suspendre … » de l'administration |
   | Reprise d'un agent | Volet « Réactiver … (reprise) » de l'administration |
   | Fermeture de l'accès des élèves | Formulaire de l'administration |
   | Réouverture de l'accès | Volet « Rouvrir l'accès des élèves (reprise) » |
   | Point hebdomadaire, note | Ajoutés à la main sur la page du journal |

   Chaque entrée est aussi tracée au journal d'audit (`journal_pilote_<type>`), sans le texte. Le journal ne se lit que par une fonction d'administration.
2. **Suspendre un agent depuis l'administration** : volet « Suspendre … » dans la section Agents. Un motif est exigé et le critère en cause peut être choisi.
3. **Fermer l'accès des élèves** : le motif devient obligatoire (3 caractères au moins) ; le critère en cause peut être choisi.
4. **Reprise exigeante** : réactiver un agent, y compris un agent suspendu par l'Orchestrateur, ou rouvrir l'accès demande les 4 points.
   - Cause identifiée.
   - Correction faite et testée (quel test).
   - Case « J'ai donné mon accord écrit ».
   - Case « L'établissement est informé ».

   Le navigateur les exige, et **la base refuse** la reprise sans eux. Les tâches suspendues de l'agent repartent ensuite dans la file, comme avant.
5. **Critère d'arrêt calculé** : « Deux suspensions immédiates pour la même cause » se calcule désormais sur le journal. Il est atteint dès que deux suspensions (agent ou accès) portent le même critère en cause. Il ne se déclare plus : une ancienne déclaration est retirée par la migration.
6. **Base** (migration 0042) :
   - fonctions d'administration `suspendre_agent_pilote`, `reprendre_agent_pilote`, `fermer_acces_pilote`, `rouvrir_acces_pilote`, `noter_journal_pilote` et `journal_pilote_liste` ;
   - contrôles des textes et de la reprise faits en base ;
   - `faits_criteres_*` renvoient en plus `suspensions_meme_cause_max`.

## Conséquences

- Les anciennes actions directes (réactivation, interrupteur d'accès) sont remplacées. Les droits de mise à jour de la base restent en place pour ne pas casser les tests d'accès existants, mais l'application n'écrit plus que par les nouvelles fonctions.
- Noms d'actions du journal d'audit : `journal_pilote_reprise_agent`, `journal_pilote_fermeture_acces` et `journal_pilote_reprise_acces` remplacent `reactivation_agent`, `fermeture_acces_eleves` et `ouverture_acces_eleves`. Les anciennes entrées restent lisibles sous leur ancien nom.
- Les tests de bout en bout qui réactivent ou rouvrent passent par l'outil `reprendre`, qui remplit les 4 points avec des textes fictifs.

## Tests

- Base : JP01 (administration seulement), JP02 (suspension motivée ; reprise refusée sans accord, sans établissement ou sans cause), JP03 (accès fermé puis rouvert ; deux suspensions pour une même cause) et JP04 (points, notes, liste, audit ; critère calculé non déclarable).
- Unitaires : critère d'arrêt calculé, avec alerte en priorité 1.
- Bout en bout : suspension avec numéro masqué et critère, reprise incomplète bloquée, reprise complète, journal, point hebdomadaire, accessibilité. Les parcours existants sont mis à jour : disponibilité, répétition du pilote, Orchestrateur.
