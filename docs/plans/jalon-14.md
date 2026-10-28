# Plan du Jalon 14 — fin du pilote

**Statut** : validé par le propriétaire le 2026-10-28 (décisions ci-dessous, ADR 0083). Étape 1 faite (ADR 0084).

**Objectif** : boucler le cycle du pilote. Après la décision de démarrer (Jalon 12) et le suivi chaque semaine (Jalon 13), la fin doit aussi être outillée :

- un rapport de fin agrégé, prêt pour la réunion de bilan et pour l'établissement ;
- une clôture en gestes sûrs, vérifiés et tracés ;
- le sort des données conforme aux durées du pack, sans rien effacer avant l'avis du juriste.

**Rien n'est déployé ni souscrit dans ce jalon** : tout est construit et essayé avec des données fictives.

**Principes inchangés** :

- données fictives seulement ;
- aucun chiffre pour un groupe de moins de 5 élèves ;
- aucune suppression de données sans durée validée par le juriste (ADR 0049) ni sans votre accord explicite ;
- aucun prompt d'agent modifié.

## Étapes (dans cet ordre)

| #   | Étape                               | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Besoin du propriétaire           |
| --- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 0   | Plan                                | Ce plan, l'ADR 0083 et `memory.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Validation (faite)               |
| 1   | Période du pilote et rapport de fin | Dates de début et de fin du pilote, saisies dans l'administration et tracées. Elles servent au rapport. Page « Rapport de fin de pilote » : les 5 questions du retour d'expérience sur **toute la période**, avec une ligne par semaine (même calcul que le rapport hebdomadaire, ADR 0082). S'y ajoutent les critères atteints pendant le pilote (alertes de la file humaine) et toutes les décisions du journal. Les résultats du questionnaire anonyme y figurent dès 5 réponses. Deux versions : équipe, et établissement (sans coûts ni détail des agents). Imprimable et téléchargeable en texte ; c'est la base du rapport de `docs/bilans/`. Tests de base, unitaires et de bout en bout ; accessibilité. | Dates du pilote                  |
| 2   | Clôture du pilote                   | Page « Clôture » : une liste de gestes, chacun vérifié par la plateforme quand c'est possible, sinon coché avec une preuve, comme les 12 conditions (ADR 0078). Les gestes : questionnaires de fin ouverts puis fermés ; rapport de fin téléchargé ; décision du propriétaire (arrêter, prolonger, élargir), notée au journal ; information des familles par le canal approuvé ; agents d'exécution mis en veille si arrêt ; dernière sauvegarde notée. Le décompte dit si la clôture est complète. Une **reprise** (prolonger) reste possible et se note au journal.                                                                                                                                             | Décision finale                  |
| 3   | Sort des données                    | Une page montre, sans aucune donnée individuelle, ce que deviendraient les données de fin de pilote selon les durées du pack : nombre de comptes et d'échanges concernés, date de purge prévue. Les comptes que les familles veulent garder restent régis par les durées ordinaires. **Simulation seulement** tant que les durées ne sont pas validées par le juriste : la purge planifiée existante (ADR 0049) reste la seule à effacer, et rien n'est effacé par ce jalon. Mise à jour de la procédure du pilote (« Après ») et de la fiche d'information si besoin.                                                                                                                                            | Avis du juriste sur les durées   |
| 4   | Passages réels des agents           | Repris des Jalons 11 à 13 : dès que la clé, la relecture des skills et l'accord sont là, mini-essais, puis séries complètes (~121 USD) après un nouvel accord.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Clé API ; accord sur chaque coût |
| 5   | Démonstration et bilan              | Un pilote **fictif** de 4 semaines, du début à la clôture : rapport de fin, gestes de clôture, simulation du sort des données. Captures et bilan, comme aux jalons précédents.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | —                                |

L'étape 4 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-10-28)

1. **Piste retenue** : fin du pilote (rapport de fin, clôture, sort des données).
2. **Écartés pour ce jalon** :
   - la commande unique de contrôles locaux ;
   - la skill « faible débit » ;
   - une nouvelle matière de 3e.

## Hors Jalon 14

- Le déploiement lui-même et toute souscription.
- Toute suppression réelle de données : elle reste celle de la purge planifiée, selon des durées validées par le juriste.
- Le déblocage de GitHub Actions (réglage du compte, par le propriétaire).
- Le format définitif du rapport de pilote pour l'établissement : il se décidera avec lui à partir de la version proposée.
