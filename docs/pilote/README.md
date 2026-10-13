# Pilote avec une classe partenaire — dossier de préparation

**Statut** : PRÉPARATION SEULEMENT (Jalon 3, étape 7). Rédigé par Claude Code ; **à relire par le propriétaire, puis par le juriste au Gabon** avant toute utilisation. Aucun élève réel n'est inscrit tant que toutes les conditions ci-dessous ne sont pas remplies.

Pays pilote : Gabon. Unité pilote : Mathématiques 3e (`ga-3e-mathematiques`).

## Documents

| Document | Pour qui | Contenu |
|---|---|---|
| [procedure.md](procedure.md) | Équipe, établissement | Déroulé du pilote : rôles, calendrier, avant / pendant / après |
| [fiche-information.md](fiche-information.md) | Parents et élèves | Ce qu'est la plateforme, ce qui est collecté, leurs droits |
| [consentements.md](consentements.md) | Parents, élèves, établissement | Accords demandés, sur papier et dans la plateforme |
| [procedure-detresse.md](procedure-detresse.md) | Équipe de veille | Que faire quand un élève exprime une détresse |
| [retour-experience.md](retour-experience.md) | Équipe, établissement | Ce qu'on mesure, questionnaires, réunion de bilan |
| [criteres-arret.md](criteres-arret.md) | Propriétaire, équipe | Quand suspendre ou arrêter le pilote |

## Conditions préalables (toutes obligatoires)

Le pilote ne commence qu'une fois chaque ligne cochée par le propriétaire, avec la preuve indiquée.

| # | Condition | Preuve | État |
|---|---|---|---|
| 1 | **Avis écrit du juriste au Gabon** : protection des données (déclaration éventuelle à l'autorité compétente), consentement des mineurs, âge de la majorité, durées de conservation, utilisation d'un service d'IA situé hors du pays, textes de ce dossier | Avis daté, versé au dossier | ☐ |
| 2 | **Accord de l'établissement** (chef d'établissement) et, si le juriste l'exige, de l'autorité académique | Lettre ou convention signée | ☐ |
| 3 | **Enseignant-référent validé** pour Mathématiques 3e (invitation activée) | Compte référent actif | ☐ |
| 4 | **Premier contenu validé** : 3 à 5 chapitres avec vidéo, quiz et script validés et publiés par le référent | Statuts « publié » dans l'espace référent | ☐ |
| 5 | **Clé API** définie hors du dépôt et **passages réels des batteries** TC + PR, TU, SU, EV conformes aux seuils (100 % interdits, 90 % pédagogie), avec relecture de l'échantillon par le référent | Rapports de tests datés | ☐ |
| 6 | **Hébergement** choisi et déployé (avec l'accord du propriétaire), sauvegardes, journal d'erreurs sans donnée personnelle | Adresse du site, test de restauration | ☐ |
| 7 | **SMS ou email réels** pour les codes de connexion et les messages aux parents, avec modèles de messages approuvés | Envoi testé sur un numéro de l'équipe | ☐ |
| 8 | **Alerte de détresse** : la personne de veille est prévenue (SMS ou email) dès qu'un signalement de priorité 1 arrive, avec relance tant qu'il n'est pas pris en charge. *Construite avec un envoi simulé (ADR 0036)* ; reste à brancher le fournisseur et à renseigner `CONTACTS_VEILLE` ; exécuteur planifié au moins toutes les 5 minutes | Test d'alerte reçu sur un vrai téléphone |
| 9 | **Équipe de veille** nommée, avec contacts d'urgence locaux complétés dans [procedure-detresse.md](procedure-detresse.md) | Tableau rempli | ☐ |
| 10 | **Valeurs provisoires validées** : FAQ du Support, délai de réponse aux tickets, durées de conservation, fiches des agents dans le pack | `statut` mis à jour dans le pack et `SOURCES.md` | ☐ |
| 11 | **Budget du pilote** approuvé (modèles de langage, SMS, hébergement), avec le plafond journalier de l'Orchestrateur (`COUT_JOUR_MAX_AGENT_USD`) | Accord écrit du propriétaire | ☐ |
| 12 | **Suspension effective** : un agent suspendu cesse de répondre ; interrupteur d'accès des élèves avec message neutre. *Construit (ADR 0034)* ; reste à l'essayer sur l'hébergement réel | Tests de bout en bout ; essai sur le site déployé |

## Ce qui reste hors du pilote

Paiements (la plateforme est gratuite, ADR 0013), WhatsApp, autres unités, rappels envoyés aux élèves (désactivés par défaut), voix ou image d'une personne réelle.
