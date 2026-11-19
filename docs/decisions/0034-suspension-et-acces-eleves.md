# 0034 — Suspension effective des agents et interrupteur d'accès des élèves

- **Date** : 2026-10-09 · **Statut** : technique, demandé par le propriétaire (conditions préalables du pilote, `docs/pilote/README.md` n° 12) · complète l'ADR 0029
- **Migration** : 0018 · **Tests** : A01-A02 (base), bout en bout (`disponibilite.spec.ts`)

## Contexte

La suspension d'un agent (par l'administration ou par l'Orchestrateur au coût anormal) ne bloquait que les tâches en file : le Professeur, le Tuteur, le Support, l'Évaluateur et le Scénariste répondaient encore. Et rien ne permettait de fermer l'accès des élèves pendant le pilote.

## Décision

1. **Agent suspendu = agent muet.** Avant tout appel à un modèle, le serveur lit `etat_agents` (module `serveur/disponibilite.ts`) : question au Professeur (réponse 503), plan du Tuteur, rapports et questions des parents, assistant d'aide, quiz (soumission et contestation : rien n'est enregistré, l'élève refera le quiz), générations du Scénariste et de l'Évaluateur. Message neutre : « Ce service est momentanément indisponible. » Les rapports hebdomadaires dus partent au premier passage après la réactivation.
2. **Interrupteur d'accès des élèves** (table `acces_eleves`, une ligne, ouverte par défaut) : modifiable par l'administration seule, en son nom, avec un motif interne (jamais montré aux élèves, ni lisible par un visiteur) ; chaque changement est inscrit au journal d'audit.
3. **Accès fermé** : espace élève, catalogue, chapitres, quiz, plan, inscription → page `/indisponible` (message neutre) ; l'API du Professeur répond 503 ; l'assistant d'aide est fermé, la FAQ reste lisible. **« Mes données »** (télécharger, supprimer) reste accessible : les droits ne sont jamais suspendus. Les espaces référent et administration ne sont pas concernés.

## Limites

- Les contrôles sont faits par le serveur ; la base ne refuse pas elle-même l'écriture d'un agent suspendu (les rôles d'agents restent limités à leur périmètre).
- Les rapports aux parents ne dépendent pas de l'interrupteur des élèves : pour les arrêter aussi, suspendre le Tuteur.
