# Protocole de retour d'expérience

**Statut** : proposition de Claude Code, à valider. Toutes les mesures sont **agrégées** (aucun résultat présenté par élève) et les questionnaires sont **anonymes et facultatifs**.

## Questions auxquelles le pilote doit répondre

1. Les élèves **utilisent-ils** la plateforme sur leur téléphone, avec leur connexion ?
2. Les contenus validés **aident-ils** à comprendre (selon les élèves et l'enseignant) ?
3. Les agents **restent-ils dans leur rôle** en conditions réelles (pas d'erreur grave, pas de sortie de périmètre, détresse bien signalée) ?
4. L'**équipe humaine** tient-elle la charge (validation, veille, tickets) ?
5. Le **coût** par élève actif est-il soutenable ?

## Indicateurs mesurés dans la plateforme (hebdomadaires, agrégés)

| Indicateur | Source en base |
|---|---|
| Élèves inscrits, dont accord du parent reçu | `eleves.statut`, `consentements` (type `inscription`) |
| Élèves actifs dans la semaine | `profils.derniere_activite` |
| Chapitres commencés, terminés | `progression` |
| Quiz passés, score moyen par chapitre, contestations | `tentatives_quiz`, `contestations_quiz`, `statistiques_quiz` (dès 5 tentatives) |
| Questions posées au professeur IA (nombre, par chapitre) | `echanges_professeur` |
| Plans de révision demandés, accords et rapports aux parents | `recommandations_tuteur`, `consentements` (`rapport_parents`), `rapports_parents` |
| Signalements par motif et source, délai de traitement | `signalements` (`cree_le`, `traite_le`) |
| Tickets par catégorie, délai de résolution | `tickets_support` |
| Coût des agents par jour, tâches échouées, suspensions | `taches`, `etat_agents`, `journal_audit` |

**Non mesuré aujourd'hui** : visionnage des vidéos (aucune trace de lecture). À ajouter avant le pilote si le propriétaire le souhaite (compteur agrégé par vidéo, sans suivi individuel).

Seuil de diffusion : aucun chiffre n'est publié pour un groupe de **moins de 5 élèves** (même règle que les statistiques de quiz).

## Questionnaires (anonymes, facultatifs)

**Élèves — début et fin** (5 minutes, échelle de 1 à 5 sauf mention) :
1. Sur quel appareil et avec quelle connexion utilises-tu la plateforme ? (choix)
2. Les vidéos se chargent-elles correctement ?
3. Les explications t'aident-elles à comprendre ?
4. Le professeur IA répond-il à tes questions de façon claire ? T'a-t-il déjà semblé se tromper ? (oui / non, exemple facultatif sans donnée personnelle)
5. Te sens-tu à l'aise avec le fait que le professeur est une IA ?
6. Qu'est-ce qui t'a manqué ? (texte libre court)

**Parents volontaires — fin** : compréhension de la fiche d'information, utilité des rapports (s'ils les ont reçus), confiance, remarques.

**Enseignant de la classe et référent — fin** (entretien de 30 minutes) : qualité et exactitude des contenus, effet observé en classe, charge de validation, signalements reçus, conditions pour continuer.

Les réponses libres sont relues avant analyse pour retirer toute donnée personnelle.

## Réunion de bilan

Participants : propriétaire, référent, enseignant de la classe, correspondant de l'établissement, équipe de veille. Ordre du jour : indicateurs, questionnaires, incidents et signalements (sans nom), coûts, propositions. Le **rapport de pilote** (dans `docs/bilans/`) ne contient que des données agrégées et anonymes.
