# 0040 — Agent Recruteur : pipeline fictif, approbation par empreinte, liste d'opposition, envoi simulé

- **Date** : 2026-10-19 · **Statut** : technique, conforme au prompt du Recruteur, au §5.2, aux ADR 0010 et 0035 · construit sans clé API (modèle simulé) · **aucun usage réel avant l'avis du juriste**
- **Migration** : 0023 · **Tests** : N01-N07 (base), unitaires, lanceur (27 scénarios TC + RC, TC-09 non applicable), bout en bout (`recrutement.spec.ts`)

## Décision

1. **Le propriétaire décide de tout** (ADR 0010). L'agent prépare : fiches, brouillons de messages, dossier d'accord. Il est appelé directement depuis `/administration/recrutement/<candidat>` (pas par la file de l'Orchestrateur : chaque tâche est demandée par le propriétaire, qui lit le résultat aussitôt). La suspension de l'agent (`etat_agents`) est vérifiée avant chaque tâche.
2. **Fiche minimale** (table `candidats`) : nom, famille, niveau, structure, email professionnel, source, adéquation, justification, points à vérifier, secteur public à vérifier, statut. Aucune colonne pour une donnée sensible, une pièce d'identité ou un numéro officiel. Le propriétaire crée la fiche ; la source doit figurer dans `sources_autorisees` du pack (`recrutement.yaml`).
3. **Rôle `agent_recruteur`**, limité au candidat fixé par le serveur (`app.candidat_id`) :
   - il lit la fiche **sans le contact** et les messages de ce candidat ;
   - il met à jour la qualification et le statut, jamais « signé », jamais après un refus ;
   - il crée des brouillons de messages et de dossiers d'accord ;
   - il inscrit un refus ou une demande de suppression (`enregistrer_opposition`) ;
   - il crée des signalements sans élève.
   Il ne peut ni approuver, ni envoyer, ni lire la liste d'opposition, ni lire une donnée d'élève.
4. **Messages figés** : la base calcule l'empreinte du texte ; un texte ne se modifie jamais (un changement = un nouveau brouillon). L'**approbation** (`approuver_message_recrutement`, administration seulement) enregistre le valideur, la date et l'empreinte du texte affiché ; une empreinte différente est refusée.
5. **Envoi** (`envoyer_message_recrutement`, service de messagerie seulement), vérifié juste avant l'envoi :
   - message approuvé et inchangé ;
   - personne ni refusée, ni dans la liste d'opposition (sinon le message est annulé) ;
   - un seul premier contact ;
   - une seule relance, après le délai du pack, seulement si la personne n'a pas répondu.
   L'envoi est **simulé** (boîte `/developpement/messages`) tant que le fournisseur d'email n'est pas choisi.
6. **Liste d'opposition** : seule une empreinte du contact (minuscules, sans espaces) est gardée. Une fiche ne peut pas être recréée pour une personne opposée. La **suppression** par le propriétaire efface la fiche, les messages et le dossier, et garde l'empreinte.
7. **Sortie imposée par schéma** : refus, réponse au responsable, fiche, message, dossier d'accord, actions (transmettre, refus, suppression, pièce d'identité non conservée, incohérence, contenu suspect, secteur public), escalade.
8. **Contrôles du serveur** (motifs génériques, aucune valeur de pays) :
   - un premier contact dit qu'il vient d'une IA, pour qui, comment la personne a été trouvée, et comment refuser ;
   - aucun montant tant qu'aucune condition n'est validée ;
   - ni pression, ni fausse urgence, ni promesse ;
   - aucune donnée sensible ni critère non pédagogique dans une fiche ou un message ;
   - aucune clause sur la voix ou l'image dans un dossier d'accord (consentement séparé) ;
   - aucun message après un refus, ni second premier contact, ni seconde relance.
   Un refus explicite (« STOP », « ne me contactez plus ») est enregistré même si l'agent l'a manqué. Le texte reçu d'un candidat n'est jamais conservé.
9. **Pack pays** : `recrutement.yaml` (sources, canaux, délai de relance, conditions validées — `null` pour l'instant —, modèles et FAQ de recrutement) et `agents/recruteur/pays.yaml` (variables du prompt). Valeurs provisoires, à valider.
10. **Skills** : les variables du prompt (`{{RESPONSABLE}}`…) sont aussi remplacées dans les skills (`composerPrompt`), car `preselection-equitable` les cite.

## Limites

- Pas d'agenda : l'entretien est proposé par message ; l'invitation d'agenda attend le choix d'un fournisseur.
- Pas de sourcing automatique : les fiches sont créées par le propriétaire depuis une source autorisée.
- Le rapport hebdomadaire n'est pas encore produit ; le tableau `/administration/recrutement` en tient lieu.
- Les motifs de contrôle sont une première barrière ; la relecture du propriétaire reste obligatoire.
