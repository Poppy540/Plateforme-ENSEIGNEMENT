# Protocole de retour d'expérience

**Statut** : proposition de Claude Code, à valider. Toutes les mesures sont **agrégées** (aucun résultat présenté par élève) et les questionnaires sont **anonymes et facultatifs**.

## Questions auxquelles le pilote doit répondre

1. Les élèves **utilisent-ils** la plateforme sur leur téléphone, avec leur connexion ?
2. Les contenus validés **aident-ils** à comprendre (selon les élèves et l'enseignant) ?
3. Les agents **restent-ils dans leur rôle** en conditions réelles (pas d'erreur grave, pas de sortie de périmètre, détresse bien signalée) ?
4. L'**équipe humaine** tient-elle la charge (validation, veille, tickets) ?
5. Le **coût** par élève actif est-il soutenable ?

## Indicateurs mesurés dans la plateforme (hebdomadaires, agrégés)

| Indicateur                                                                                             | Source en base                                                                    |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Élèves inscrits, dont accord du parent reçu                                                            | `eleves.statut`, `consentements` (type `inscription`)                             |
| Élèves actifs dans la semaine                                                                          | `profils.derniere_activite`                                                       |
| Chapitres commencés, terminés                                                                          | `progression`                                                                     |
| Quiz passés, score moyen par chapitre, contestations                                                   | `tentatives_quiz`, `contestations_quiz`, `statistiques_quiz` (dès 5 tentatives)   |
| Questions posées au professeur IA (nombre, par chapitre)                                               | `echanges_professeur`                                                             |
| Plans de révision demandés, accords et rapports aux parents                                            | `recommandations_tuteur`, `consentements` (`rapport_parents`), `rapports_parents` |
| Signalements par motif et source, délai de traitement                                                  | `signalements` (`cree_le`, `traite_le`)                                           |
| Tickets par catégorie, délai de résolution                                                             | `tickets_support`                                                                 |
| Coût des agents par jour (tous les appels au modèle), tâches échouées, suspensions                     | `consommation_agents`, `taches`, `etat_agents`, `journal_audit`                   |
| Vidéos démarrées et vues jusqu'au bout, leçons écrites ouvertes, par chapitre et par jour (sans élève) | `visionnages_jour` (ADR 0052)                                                     |

Ces indicateurs sont réunis sur `/administration/exploitation` et dans l'export CSV agrégé, qui applique déjà le seuil de diffusion ci-dessous (ADR 0046). **Pour le point hebdomadaire**, la page « Semaine du pilote » (`/administration/semaine`, ADR 0082) répond aux 5 questions, avec la semaine précédente en regard, en version équipe ou en version pour l'établissement (sans coûts ni détail des agents) ; elle s'imprime et se télécharge en texte.

Seuil de diffusion : aucun chiffre n'est publié pour un groupe de **moins de 5 élèves** (même règle que les statistiques de quiz).

## Questionnaires (anonymes, facultatifs)

**Élèves et parents — dans la plateforme** (ADR 0052) : les questions sont dans `referentiels/gabon/questionnaire.yaml`, **à valider par le propriétaire** ; d'ici là, le questionnaire n'est montré à personne.

- Élèves : 5 questions, depuis leur espace.
- Parents : 4 questions, depuis le lien d'un rapport.
- Réponses fermées seulement (échelle de 1 à 5 ou choix), **sans texte libre** : aucune donnée personnelle ne peut y entrer.
- Une réponse par personne, jamais rattachée à un compte.
- Résultats et export CSV sur `/administration/exploitation`, à partir de 5 réponses.

**Enseignant de la classe et référent — fin** (entretien de 30 minutes) : qualité et exactitude des contenus, effet observé en classe, charge de validation, signalements reçus, conditions pour continuer.

Les notes d'entretien sont relues avant analyse pour retirer toute donnée personnelle.

## Réunion de bilan

Participants : propriétaire, référent, enseignant de la classe, correspondant de l'établissement, équipe de veille. Ordre du jour : indicateurs, questionnaires, incidents et signalements (sans nom), coûts, propositions. Le **rapport de pilote** (dans `docs/bilans/`) ne contient que des données agrégées et anonymes.
