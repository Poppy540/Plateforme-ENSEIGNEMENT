# Répétition complète du pilote

**Statut** : Jalon 6, étape 6. La répétition **automatique** tourne déjà en simulation, sur la base locale avec des données fictives (`application/tests/bout-en-bout/repetition-pilote.spec.ts`, dans `pnpm test:e2e`). La répétition **réelle** se fait sur le site déployé, avant l'arrivée des élèves (conditions 6, 7, 8 et 12 du [dossier](README.md)).

## Qui, quand

- **Qui** : le propriétaire (administration), le référent, une personne de l'équipe de veille, et deux membres de l'équipe qui jouent l'élève et le parent, **avec leurs propres numéros**. Aucun élève réel.
- **Quand** : après le déploiement et l'importation du pack, avant la première séance en classe. Prévoir 1 h 30.
- **Après** : effacer les comptes de répétition. L'élève passe par « Supprimer mon compte » ; les autres comptes sont supprimés par le propriétaire.

## Déroulé et résultats attendus

| #   | Qui                       | Action                                                                                                                              | Résultat attendu                                                                                                                   | Automatique                    |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | Propriétaire              | `pnpm verifier:production` sur le serveur, puis `pnpm verifier:site https://<adresse>` depuis un autre poste                        | « Configuration complète », puis « Site conforme » (aucun contrôle en échec)                                                       | —                              |
| 2   | Référent                  | Activer l'invitation ; valider un chapitre, puis un quiz de ce chapitre                                                             | Le chapitre et le quiz sont « validés » ; la décision apparaît dans « Mes dernières décisions »                                    | ✔ 1                            |
| 3   | « Élève »                 | S'inscrire (classe du chapitre) avec le numéro du « parent »                                                                        | Le parent reçoit un **SMS réel** avec un lien ; après son accord, le compte de l'élève est actif                                   | ✔ 2 (message simulé)           |
| 4   | « Élève »                 | Ouvrir le chapitre, poser une question, passer le quiz, demander un plan                                                            | Réponse qui guide sans donner la solution ; score enregistré ; trois priorités au plus                                             | ✔ 2                            |
| 5   | « Élève »                 | Écrire au professeur un message de détresse convenu à l'avance (« je suis triste et j'ai peur de l'examen »)                        | Réponse qui oriente vers un adulte de confiance. **La personne de veille reçoit un SMS réel** : priorité 1, sans prénom ni message | ✔ 3 (message simulé)           |
| 6   | Veille, puis propriétaire | Suivre [procedure-detresse.md](procedure-detresse.md) jusqu'au bout, puis **Marquer comme traité** dans la file humaine             | Plus aucune relance après le traitement ; délai noté                                                                               | ✔ 3                            |
| 7   | Propriétaire              | Ne rien traiter pendant 2 h sur un second signalement d'essai                                                                       | Relance reçue (exécuteur planifié toutes les 5 minutes)                                                                            | —                              |
| 8   | Propriétaire              | **Fermer l'accès des élèves** avec un motif                                                                                         | L'élève voit un message neutre ; « Mes données » reste ouvert                                                                      | ✔ 4                            |
| 9   | Propriétaire              | **Déconnecter toutes les sessions**                                                                                                 | L'élève et le référent doivent redemander un code ; le propriétaire reste connecté                                                 | ✔ 4                            |
| 10  | Propriétaire              | Suspendre un agent dans l'administration (motif), puis le réactiver avec les 4 points de la reprise ; vérifier le journal du pilote | L'agent ne répond plus pendant la suspension, puis reprend                                                                         | (test `disponibilite`)         |
| 11  | Propriétaire              | **Rouvrir l'accès** (les 4 points de la reprise), puis ouvrir le pilotage de l'exploitation et les exports                          | Activité visible, petits nombres masqués « <5 », aucun numéro ni identifiant dans les CSV                                          | ✔ 4, 5                         |
| 12  | Propriétaire              | Restaurer la sauvegarde du jour dans une base jetable (`pnpm base:restaurer`, [dossier de production](../production/README.md) §5)  | « Restauration vérifiée » ; durée notée                                                                                            | (essai `pnpm test:sauvegarde`) |

## Compte rendu

Pour chaque ligne : fait ou non fait, l'heure, l'écart constaté, la correction prévue. Le compte rendu va dans `docs/bilans/` et ne contient **aucun numéro** ni prénom. Une ligne en échec bloque le pilote jusqu'à ce qu'elle soit corrigée et refaite.
