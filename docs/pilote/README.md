# Pilote avec une classe partenaire — dossier de préparation

**Statut** : PRÉPARATION SEULEMENT (Jalon 3, étape 7). Rédigé par Claude Code ; **à relire par le propriétaire, puis par le juriste au Gabon** avant toute utilisation. Aucun élève réel n'est inscrit tant que toutes les conditions ci-dessous ne sont pas remplies.

**Par où commencer** : le [guide de mise en route du propriétaire](../mise-en-route.md) met toutes ces démarches dans l'ordre.

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
| [repetition.md](repetition.md) | Propriétaire, équipe | Répétition complète avant le pilote : déroulé, résultats attendus |
| [guide-referent.md](guide-referent.md) | Enseignant-référent | Utiliser l'espace référent : valider, rejeter, publier, signaler |
| [../juridique/dossier-juriste.md](../juridique/dossier-juriste.md) | Juriste | Registre des traitements, sous-traitants, risques pour les mineurs, 19 questions (condition 1) |

## Conditions préalables (toutes obligatoires)

Le pilote ne commence qu'une fois chaque ligne cochée par le propriétaire, avec la preuve indiquée. **Point au 2026-10-21 (Jalon 6, étape 6) : aucune condition n'est encore remplie.** La colonne « Prêt » dit ce que la plateforme fait déjà ; la colonne « Reste » dit ce qui manque, et qui le fournit.

| # | Condition | Preuve | Prêt dans la plateforme | Reste (qui) | État |
|---|---|---|---|---|---|
| 1 | **Avis écrit du juriste au Gabon** : protection des données, consentement des mineurs, âge de la majorité, durées de conservation (et D2, D3 de la revue de sécurité), IA hors du pays, textes de ce dossier, mention d'information du questionnaire | Avis daté, versé au dossier | Durées et résumés réglables dans `pays.yaml` ; purge étendue prête, sans effacement tant que les durées sont vides (ADR 0049) | Trouver le juriste, lui transmettre le [dossier pour le juriste](../juridique/dossier-juriste.md), qui renvoie aux autres pièces (propriétaire) | ☐ |
| 2 | **Accord de l'établissement** (chef d'établissement) et, si le juriste l'exige, de l'autorité académique | Lettre ou convention signée | Fiche d'information et consentements rédigés | Choisir l'établissement, signer (propriétaire) | ☐ |
| 3 | **Enseignant-référent validé** pour Mathématiques 3e (invitation activée) | Compte référent actif | Invitation (`/administration/invitations`), activation, [guide du référent](guide-referent.md) | Recruter le référent (propriétaire, avec l'agent Recruteur après l'avis du juriste) | ☐ |
| 4 | **Premier contenu validé** : 3 à 5 chapitres avec vidéo, quiz et script validés et publiés par le référent | Statuts « publié » dans l'espace référent | Validation des chapitres, scripts, quiz, vidéos, liens de prérequis ; leçons écrites tirées des scripts validés (lisibles sans vidéo, ADR 0051) | Programmes IPN, travail du référent ; fournisseur vidéo, sinon le pilote peut s'appuyer sur les leçons écrites (décision du propriétaire) | ☐ |
| 5 | **Clé API** définie hors du dépôt et **passages réels des batteries** TC + PR, TU, SU, EV conformes aux seuils (100 % interdits, 90 % pédagogie), avec relecture de l'échantillon par le référent | Rapports de tests datés | Batteries et lanceur prêts (`MODE_MODELE=anthropic pnpm test:agents --confirmer`, voir `tests/README.md`), coût estimé ~105 USD | Clé API et accord sur chaque coût (propriétaire) ; relecture (référent) | ☐ |
| 6 | **Hébergement** choisi et déployé (avec l'accord du propriétaire), sauvegardes, journal d'erreurs sans donnée personnelle | Adresse du site, test de restauration | Dossier `docs/production/`, `pnpm verifier:production`, `/api/sante` ; journal d'erreurs sans donnée personnelle (ADR 0056) ; vidéo prête à brancher (ADR 0055) | Choix et souscription de l'hébergeur et de Supabase, déploiement, test de restauration (propriétaire) | ☐ |
| 7 | **SMS ou email réels** pour les codes de connexion et les messages aux parents, avec modèles de messages approuvés | Envoi testé sur un numéro de l'équipe | Adaptateurs Twilio, Brevo et passerelle HTTP (ADR 0045) ; indicatifs limités au pack (ADR 0049) | Choix des fournisseurs, approbation des modèles de messages (propriétaire) | ☐ |
| 8 | **Alerte de détresse** : la personne de veille est prévenue (SMS ou email) dès qu'un signalement de priorité 1 arrive, avec relance tant qu'il n'est pas pris en charge ; exécuteur planifié au moins toutes les 5 minutes | Test d'alerte reçu sur un vrai téléphone | Alerte et relances (ADR 0036), vérifiées par la [répétition](repetition.md) en simulation | Fournisseur SMS, `CONTACTS_VEILLE`, planification de l'exécuteur, test sur un vrai téléphone (propriétaire) | ☐ |
| 9 | **Équipe de veille** nommée, avec contacts d'urgence locaux complétés dans [procedure-detresse.md](procedure-detresse.md) | Tableau rempli | Procédure rédigée | Nommer l'équipe, remplir les contacts (propriétaire) | ☐ |
| 10 | **Valeurs provisoires validées** : FAQ du Support, délai de réponse aux tickets, durées de conservation, fiches des agents, questionnaire anonyme | `statut` mis à jour dans le pack et `SOURCES.md` | Toutes les valeurs sont dans le pack, marquées « à valider » | Relecture (propriétaire, référent, juriste pour les durées) | ☐ |
| 11 | **Budget du pilote** approuvé (modèles de langage, SMS, hébergement), avec le plafond journalier par agent (`COUT_JOUR_MAX_AGENT_USD`) | Accord écrit du propriétaire | Plafond appliqué à chaque appel, suspension et alerte ; tableau de bord des coûts (ADR 0046) | Montants (propriétaire) | ☐ |
| 12 | **Suspension effective** : un agent suspendu cesse de répondre ; interrupteur d'accès des élèves avec message neutre ; fermeture de toutes les sessions en cas d'incident | Tests de bout en bout ; essai sur le site déployé | Construit (ADR 0034, 0049), vérifié par la [répétition](repetition.md) en simulation | Refaire la répétition sur le site déployé (propriétaire et équipe) | ☐ |

## Ce qui reste hors du pilote

Paiements (la plateforme est gratuite, ADR 0013), WhatsApp, unités autres que Mathématiques 3e (déjà dans le pack, à valider plus tard), rappels envoyés aux élèves (désactivés par défaut), voix ou image d'une personne réelle.
