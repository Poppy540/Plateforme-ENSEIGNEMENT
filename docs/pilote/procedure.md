# Procédure du pilote

**Statut** : proposition de Claude Code, à valider par le propriétaire et l'établissement. Les durées et effectifs sont des propositions.

## Format proposé

- **Une classe de 3e** d'un établissement partenaire, de **20 à 40 élèves** volontaires.
- **4 semaines** d'usage, pendant une période de cours normale (pas pendant les examens).
- **3 à 5 chapitres** de Mathématiques 3e publiés, en complément du cours de l'enseignant de la classe, **jamais à sa place**.
- Participation **volontaire** : un élève qui ne participe pas n'est ni pénalisé ni défavorisé (le contenu reste un complément ; l'enseignant de la classe ne note rien à partir de la plateforme).

## Rôles

| Rôle                             | Qui                                                        | Responsabilités                                                                                                               |
| -------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Propriétaire                     | Le porteur du projet                                       | Décide du lancement, des suspensions et de l'arrêt ; signe avec l'établissement                                               |
| Enseignant-référent              | Enseignant de Mathématiques validé                         | Valide tous les contenus ; relit des échanges anonymisés si besoin ; traite les signalements de contenu                       |
| Enseignant de la classe          | Enseignant de la classe partenaire (peut être le référent) | Présente le pilote, accompagne les séances de découverte, fait remonter les difficultés                                       |
| Équipe de veille                 | Au moins **deux** personnes nommées                        | Surveille la file humaine (`/administration`), applique la [procédure de détresse](procedure-detresse.md), répond aux tickets |
| Correspondant de l'établissement | Désigné par le chef d'établissement                        | Contact pour les parents et pour toute situation grave                                                                        |

Aucun agent IA ne prend de décision dans le pilote : ils proposent, les humains valident (cadrage §5.1).

## Avant (2 à 4 semaines)

1. Remplir les [conditions préalables](README.md#conditions-préalables-toutes-obligatoires).
2. Réunion d'information avec l'établissement et l'enseignant de la classe : démonstration (captures `docs/demo/`), limites de l'IA, procédure de détresse.
3. Réunion ou courrier aux parents : remise de la [fiche d'information](fiche-information.md) et du [formulaire d'accord](consentements.md). Délai de réflexion d'au moins une semaine.
4. Collecte des accords papier par le correspondant de l'établissement. **Seuls les élèves dont l'accord est rendu participent.**
5. Vérifier la plateforme en conditions réelles avec des comptes de l'équipe (données fictives) : connexion par SMS, catalogue, vidéo en faible débit, quiz, aide, rapport à un parent, alerte de détresse.
6. Questionnaire de départ aux élèves participants ([retour d'expérience](retour-experience.md)).

## Pendant (4 semaines)

- **Séance de découverte** en classe (ou en salle informatique) : chaque élève s'inscrit avec le numéro de son parent, le parent accepte depuis le lien reçu. L'élève n'entre jamais le numéro d'un autre élève.
- **Veille** : la file humaine est consultée au moins **matin et soir** les jours scolaires et **une fois par jour** le week-end (fréquence à valider) ; une détresse est traitée selon sa [procédure](procedure-detresse.md), sans attendre.
- **Point hebdomadaire** (30 minutes) entre l'équipe, le référent et l'enseignant de la classe : indicateurs de la semaine, signalements, tickets, coûts ; décision de continuer, d'ajuster ou de suspendre ([critères d'arrêt](criteres-arret.md)).
- **Aucun changement des prompts ni des droits des agents** pendant le pilote sans accord du propriétaire ; toute correction de contenu passe par le référent.
- **Journal du pilote** tenu par l'équipe : date, fait, décision (sans nom ni donnée d'élève).

## Après (2 semaines)

1. Questionnaires de fin (élèves, parents volontaires, enseignant) et réunion de bilan.
2. Rapport de pilote : indicateurs agrégés, retours, incidents, décisions (aucune donnée nominative). Sa base est la page « Rapport de fin de pilote » de l'administration (`/administration/fin-pilote`, ADR 0084) : dates du pilote, les 5 questions sur toute la période et semaine par semaine, questionnaire anonyme, critères signalés et décisions ; version équipe ou version établissement, imprimable et téléchargeable en texte.
3. Décision du propriétaire : arrêter, prolonger, élargir, notée sur la page « Clôture du pilote » (`/administration/cloture`, ADR 0085), qui suit aussi les autres gestes de fin (questionnaires, réunion, rapport téléchargé, familles informées, mise en veille si arrêt, dernière sauvegarde).
4. Données : les élèves gardent leur compte s'ils le souhaitent ; sinon suppression depuis « Mes données » ou par l'équipe sur demande. Les durées de conservation validées par le juriste s'appliquent ensuite (purge planifiée).
