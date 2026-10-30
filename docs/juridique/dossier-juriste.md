# Dossier pour le juriste — protection des données et des mineurs

**Pour** : le juriste chargé d'examiner la plateforme avant le pilote au Gabon.
**De** : le propriétaire de la plateforme. Dossier préparé par Claude Code (Jalon 8, étape 1), à relire par le propriétaire avant transmission.
**Date** : 2026-10-22 · **État de la plateforme** : construite et testée en simulation, avec des données fictives. **Aucun élève réel**, rien n'est déployé.

> Ce document décrit ce que la plateforme fait réellement des données, d'après son code et sa configuration. Ce n'est **pas un avis juridique** : il sert à préparer le vôtre. Les points à trancher sont rassemblés au §8 ; chacun renvoie à l'endroit du dossier où il se pose.

## Sommaire

1. La plateforme en bref
2. Qui fait quoi
3. Registre des traitements
4. Sous-traitants et transferts hors du Gabon
5. Droits des personnes
6. Mesures de sécurité
7. Risques pour les mineurs
8. Questions au juriste
9. Documents joints

## 1. La plateforme en bref

- **Ce qu'elle fait** : cours en ligne du collège au lycée, sur téléphone. Le pilote porte sur une classe de 3e : Mathématiques, puis Sciences et Français.
- **Les « professeurs »** : des intelligences artificielles (agents). Elles l'annoncent toujours.
- **Validation humaine** : un enseignant-référent valide chaque contenu (chapitres, scripts, quiz, vidéos) avant qu'un élève ne le voie.
- **Gratuité** : le pilote est gratuit, sans paiement, sans publicité, sans revente de données.
- **Minimisation** : prénom ou pseudonyme seulement, pas de nom de famille, établissement facultatif. Aucune donnée sensible n'est demandée (santé, religion, opinions, origine).
- **Mineurs** : tant que l'âge de la majorité n'est pas confirmé, **tout élève est traité comme mineur**, et l'accord d'un parent est exigé par la base de données elle-même.

## 2. Qui fait quoi

| Rôle                      | Qui                                                                                  | À confirmer                                              |
| ------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Responsable du traitement | Le propriétaire de la plateforme (personne ou structure à préciser)                  | Forme juridique, adresse, représentant au Gabon (§8, Q2) |
| Établissement partenaire  | Collège du pilote : informe les familles, recueille l'accord papier de participation | Convention à signer (§8, Q3)                             |
| Enseignants-référents     | Enseignants recrutés pour valider les contenus d'une famille de matières             | Contrat ; activité annexe d'un agent public (§8, Q14)    |
| Équipe de veille          | Personnes nommées pour traiter une détresse d'élève                                  | Obligations de signalement (§8, Q10)                     |
| Sous-traitants            | Hébergement, base de données, modèle d'IA, SMS, email, vidéo (§4)                    | Contrats de sous-traitance (§8, Q6)                      |

## 3. Registre des traitements

Pour chaque traitement : les données, la finalité, la durée de conservation, qui y accède, et la base légale. La base légale est **laissée à votre appréciation** (consentement du parent, exécution du service, intérêt légitime).

« Pack » désigne le fichier de configuration du pays (`referentiels/gabon/pays.yaml`). Les durées qui y sont inscrites sont des **propositions** ; une durée « non fixée » signifie que rien n'est effacé automatiquement en attendant votre décision.

### T1. Comptes et connexion

|                |                                                                                                                                                                                                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personnes**  | Élèves, enseignants-référents, administration (les parents n'ont pas de compte)                                                                                                                                                                                                     |
| **Données**    | Numéro de téléphone ou email de connexion (chez le fournisseur d'authentification) ; prénom ou pseudonyme ; rôle ; dates de création et de dernière activité ; sessions (identifiant, dates) ; compteurs anti-abus des codes, tenus sous forme d'empreinte, sans le numéro en clair |
| **Finalité**   | Se connecter par un code reçu par SMS ou email, sans mot de passe                                                                                                                                                                                                                   |
| **Durée**      | Compte sans activité : **730 jours** (pack). Inscription jamais acceptée par un parent : **30 jours**. Sessions fermées : effacées après 1 jour. Durée d'une session : 30 jours (élève), 7 jours (référent, enseignant de la classe), 12 heures (administration)                    |
| **Accès**      | La personne elle-même ; le serveur ; l'administration pour la gestion                                                                                                                                                                                                               |
| **Références** | ADR 0003, 0004, 0019, 0043, 0049                                                                                                                                                                                                                                                    |

### T2. Inscription de l'élève et accord du parent

|                    |                                                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Données**        | Classe, série, établissement (facultatif) ; mineur ou non ; numéro ou email du parent ; accord (dates de demande, d'acceptation, de retrait) ; empreinte du lien d'accord, jamais le lien en clair                  |
| **Finalité**       | Obtenir l'accord du parent avant tout accès aux cours                                                                                                                                                               |
| **Fonctionnement** | L'élève saisit le contact du parent. Le parent reçoit un lien à usage unique et accepte. Sans cet accord, le compte reste inactif. Les SMS ne partent que vers les indicatifs des pays ouverts (+241 pour le Gabon) |
| **Durée**          | Avec le compte (T1) ; effacement en cascade à la suppression                                                                                                                                                        |
| **Accès**          | L'élève (sa fiche) ; le service d'envoi de messages (pour envoyer le lien) ; l'administration                                                                                                                       |
| **Références**     | ADR 0004, 0043, 0049 ; `docs/pilote/consentements.md`                                                                                                                                                               |

### T3. Apprentissage

|                |                                                                                                                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Données**    | Chapitres vus ou terminés ; réponses et scores aux quiz ; contestations ; préférences (temps disponible, qualité de connexion, rappels désactivés par défaut) ; plans de révision du Tuteur (agent IA) ; **échanges écrits avec le professeur IA** |
| **Finalité**   | Suivre le travail de l'élève et lui proposer des révisions. Les élèves ne sont **jamais comparés** entre eux                                                                                                                                       |
| **Durée**      | Échanges avec le professeur : **365 jours** (pack). Le reste : avec le compte. Ces durées s'appliquent par une purge quotidienne, **qui ne sera planifiée qu'après votre avis**                                                                    |
| **Accès**      | L'élève ; les agents IA strictement limités à **cet élève et ce chapitre** (règles de la base) ; les référents ne voient **aucun élève**, seulement des statistiques de quiz anonymes à partir de 5 tentatives                                     |
| **Références** | ADR 0006, 0014, 0030, 0049                                                                                                                                                                                                                         |

### T4. Envoi au modèle d'intelligence artificielle

|                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Données envoyées**          | La question de l'élève, l'historique récent de ses échanges **sur ce chapitre** et le programme validé du chapitre ; pour le Tuteur, la progression de l'élève. **Ni prénom, ni identifiant, ni contact**                                                                                                                                                                                                                                                        |
| **Point d'attention**         | Un élève pourrait écrire spontanément son nom ou son numéro dans une question. Depuis le Jalon 9 (ADR 0062), les numéros de téléphone, emails, liens et identifiants techniques sont masqués avant l'envoi au Professeur, à l'Évaluateur et au Tuteur (et dans l'historique des questions), comme pour le Support et le Recruteur. Les nombres des exercices restent intacts. Les **noms** ne sont pas masqués : ils ne se repèrent pas de façon fiable (§8, Q8) |
| **Fournisseur**               | Anthropic (modèle Claude), hors du Gabon (§4)                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Durée chez le fournisseur** | Selon ses conditions (à confirmer, §8, Q6)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Références**                | ADR 0017, 0043                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### T5. Rapports aux parents

|                |                                                                                                                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Données**    | Accord séparé (consentement « rapports », distinct de l'inscription) ; contact du parent ; contenu du rapport hebdomadaire (progression, points forts et à renforcer, suggestions), rédigé par le Tuteur ; empreinte du lien (valable 60 jours) ; questions du parent au Tuteur, avec un quota par jour |
| **Finalité**   | Informer le parent, **seulement si l'élève l'a proposé et si le parent l'a accepté**                                                                                                                                                                                                                    |
| **Durée**      | Rapports : **non fixée** (pack, en attente de votre avis). Le contact du parent est effacé dès l'arrêt des rapports                                                                                                                                                                                     |
| **Accès**      | Le parent, par son lien ; l'élève (son export)                                                                                                                                                                                                                                                          |
| **Références** | ADR 0031, 0043                                                                                                                                                                                                                                                                                          |

### T6. Sécurité, détresse et assistance

|                |                                                                                                                                                                                                                                                                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Données**    | Signalements rédigés par un agent : motif, priorité, **résumé, qui peut décrire une détresse** ; tickets d'assistance (catégorie, résumé) ; alertes à l'équipe de veille (nombre et motifs seulement, **sans aucune donnée d'élève**) ; journal d'audit des décisions (acteur sous forme d'empreinte) ; journaux techniques nettoyés de toute donnée personnelle |
| **Finalité**   | Protéger l'élève (une détresse est traitée par un humain en priorité) ; répondre aux demandes d'aide ; tracer les décisions                                                                                                                                                                                                                                      |
| **Durée**      | Signalements traités et tickets résolus : **non fixées** (pack). À la suppression du compte, le résumé est gardé, détaché du compte ; le pack peut demander son effacement (§8, Q9)                                                                                                                                                                              |
| **Accès**      | L'administration et l'équipe de veille seulement (les référents n'y ont plus accès)                                                                                                                                                                                                                                                                              |
| **Références** | ADR 0033, 0036, 0049, 0056 ; `docs/pilote/procedure-detresse.md`                                                                                                                                                                                                                                                                                                 |

### T7. Enseignants-référents

|                |                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Données**    | Prénom ou pseudonyme ; familles de matières ; décisions de validation (version, empreinte du contenu, commentaire, date) ; documents officiels déposés ; empreinte du code d'invitation |
| **Finalité**   | Valider les contenus et tracer chaque validation                                                                                                                                        |
| **Durée**      | Avec le compte ; la suppression se fait avec le propriétaire, parce que les validations sont tracées                                                                                    |
| **Accès**      | Le référent ; les autres référents voient le prénom d'un valideur ; l'administration                                                                                                    |
| **Références** | ADR 0007 et suivantes, 0039, 0049                                                                                                                                                       |

### T8. Recrutement des référents (prospection)

|                |                                                                                                                                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Données**    | Nom, niveau et établissement d'enseignement, **contact professionnel (email)**, source (autorisée par le pack : recommandation, réseau professionnel…), évaluation de l'adéquation, messages (brouillons approuvés par le propriétaire avant tout envoi), dossier d'accord ; **liste d'opposition** (empreinte salée du contact seulement, jamais le contact) |
| **Finalité**   | Trouver des enseignants-référents, avec l'aide d'un agent IA qui prépare ; le propriétaire décide et envoie                                                                                                                                                                                                                                                   |
| **Durée**      | Candidats refusés ou supprimés : **non fixée** (pack). La liste d'opposition est gardée pour ne jamais recontacter                                                                                                                                                                                                                                            |
| **Accès**      | Le propriétaire ; l'agent Recruteur limité à un candidat à la fois, **sans voir son contact**                                                                                                                                                                                                                                                                 |
| **Références** | ADR 0010, 0040, 0049                                                                                                                                                                                                                                                                                                                                          |

### T9. Voix et image d'une personne réelle

|           |                                                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **État**  | **Non utilisé** : les vidéos utilisent un avatar et une voix **de synthèse** du catalogue d'un fournisseur, sans ressemblance avec une personne réelle             |
| **Prévu** | Si un jour une personne réelle prêtait sa voix ou son image : autorisation écrite, séparée, enregistrée et révocable, exigée par la chaîne de production (§8, Q15) |

### T10. Mesures du pilote

|                |                                                                                                                                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Données**    | Compteur de lecture **par chapitre et par jour, sans aucun élève** ; questionnaire **anonyme**, à réponses fermées, sans texte libre, non rattaché à un compte et daté à la semaine ; la mention « déjà répondu » est gardée à part, sous forme d'empreinte |
| **Diffusion**  | Administration seulement ; aucun chiffre pour un groupe de moins de 5                                                                                                                                                                                       |
| **État**       | Questionnaire inactif tant que le propriétaire ne l'a pas validé (§8, Q11)                                                                                                                                                                                  |
| **Références** | ADR 0046, 0052                                                                                                                                                                                                                                              |

### T11. Classe du pilote et suivi par l'enseignant de la classe

|                              |                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personnes**                | Élèves qui rejoignent leur classe avec le code donné par leur enseignant (facultatif) ; enseignant de la classe, invité par le propriétaire                                                                                                                                                                                                                                                                            |
| **Données**                  | Rattachement de l'élève à une classe (nom de la classe, établissement) ; prénom ou pseudonyme de l'enseignant et classes suivies ; codes gardés seulement sous forme d'empreinte                                                                                                                                                                                                                                       |
| **Finalité**                 | Permettre à l'enseignant de suivre l'avancement de sa classe pendant le pilote                                                                                                                                                                                                                                                                                                                                         |
| **Ce que voit l'enseignant** | Des **chiffres d'ensemble** seulement : élèves inscrits et venus dans les 7 jours, élèves ayant commencé ou terminé chaque chapitre, quiz passés et score moyen, notions les plus manquées. **Aucun nom, aucun message, aucune réponse d'élève.** Tout nombre de 1 à 4 élèves est masqué, et rien n'est montré tant que la classe compte moins de 5 élèves. Le calcul et le masquage sont faits par la base de données |
| **Durée**                    | Le rattachement dure tant que l'élève reste dans la classe (il peut la quitter) ; il disparaît avec son compte                                                                                                                                                                                                                                                                                                         |
| **Accès**                    | L'élève (sa classe) ; l'enseignant (le tableau agrégé de ses classes) ; l'administration                                                                                                                                                                                                                                                                                                                               |
| **État**                     | Construit et testé en simulation (Jalon 9). Aucun usage réel avant votre avis (§8, Q19)                                                                                                                                                                                                                                                                                                                                |
| **Références**               | ADR 0063                                                                                                                                                                                                                                                                                                                                                                                                               |

### T12. Suivi du pilote par l'équipe

|                |                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personnes**  | L'équipe (propriétaire, administration). **Aucun élève** n'y est désigné                                                                                                                                                                                                                                                                                                                                                          |
| **Données**    | Conditions de démarrage cochées avec une **preuve courte** ; critères de suspension déclarés avec un **motif** ; journal du pilote (suspensions, reprises, points de la semaine, notes, décision finale) ; gestes de clôture avec preuve ; dates du pilote. Les numéros et emails écrits dans ces textes sont masqués automatiquement ; **les noms ne le sont pas** : l'écran demande de ne pas en écrire (revue du Jalon 16, S7) |
| **Finalité**   | Décider de démarrer, suspendre, reprendre et clore le pilote, et en garder la trace                                                                                                                                                                                                                                                                                                                                               |
| **Diffusion**  | Administration seulement. Les décisions figurent dans la version **équipe** des rapports de la semaine et de fin de pilote, jamais dans la version pour l'établissement. Les chiffres de ces rapports sont agrégés, sans aucun groupe de moins de 5                                                                                                                                                                               |
| **Durée**      | Durée du dossier du pilote, à fixer par vous (non fixée : rien n'est effacé automatiquement)                                                                                                                                                                                                                                                                                                                                      |
| **Accès**      | Administration ; journal d'audit pseudonymisé (codes et dates, sans les preuves)                                                                                                                                                                                                                                                                                                                                                  |
| **Références** | ADR 0078, 0080, 0081, 0084, 0085, 0092                                                                                                                                                                                                                                                                                                                                                                                            |

## 4. Sous-traitants et transferts hors du Gabon

**Aucun fournisseur n'est encore choisi ni souscrit.** Le tableau donne les candidats envisagés et les données qui leur seraient confiées.

| Service                               | Candidat envisagé                                              | Données confiées                                                                       | Hors du Gabon                                     |
| ------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Base de données et authentification   | Supabase (région à choisir)                                    | Toutes les données du §3 ; numéros et emails de connexion                              | Oui (région à décider avec vous)                  |
| Hébergement de l'application          | Vercel ou Cloudflare                                           | Requêtes (adresses IP), journaux techniques nettoyés                                   | Oui                                               |
| Modèle d'IA                           | Anthropic (Claude)                                             | Questions des élèves et historique du chapitre, sans identité (T4) ; textes des agents | Oui (États-Unis)                                  |
| SMS                                   | Twilio, puis peut-être un agrégateur local                     | Numéros des élèves, des parents et de l'équipe de veille ; textes des messages         | Oui pour Twilio ; à voir pour un agrégateur local |
| Email                                 | Brevo (ou autre)                                               | Emails et textes des messages                                                          | Oui                                               |
| Vidéo                                 | Cloudflare Stream ; fournisseur d'avatar synthétique à choisir | Vidéos de cours et scripts validés, **sans donnée d'élève** ; adresses IP des lecteurs | Oui                                               |
| Surveillance des erreurs (facultatif) | À choisir                                                      | Erreurs déjà nettoyées, sans donnée personnelle                                        | Selon le service                                  |

## 5. Droits des personnes

| Droit                    | Comment                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Information              | Fiche d'information remise aux familles (`docs/pilote/fiche-information.md`) ; l'IA se présente toujours comme une IA          |
| Accès et portabilité     | « Mes données » : téléchargement immédiat de toutes les données du compte (élève, référent, administration)                    |
| Effacement               | L'élève supprime lui-même son compte, avec un effet immédiat et en cascade. Référents et administration : avec le propriétaire |
| Retrait du consentement  | Rapports aux parents : arrêt par l'élève ou par le parent, en un geste. Inscription : par la suppression du compte             |
| Opposition (recrutement) | Un refus est enregistré et empêche tout nouveau contact                                                                        |
| Parents                  | Ils exercent leurs droits **par leur enfant ou auprès de l'équipe**, faute de compte (§8, Q12)                                 |

## 6. Mesures de sécurité (résumé)

- **Accès** : règles au niveau de chaque ligne de la base. Chaque agent IA a son propre rôle, limité à l'élève et au chapitre fixés par le serveur, jamais par le modèle.
- **Validation humaine** : aucun contenu n'est montré à un élève sans validation tracée (version et empreinte du contenu). Une vidéo n'est publiée que par un geste distinct du référent.
- **Connexion** : sans mot de passe, codes limités en nombre (codes de connexion, et depuis le Jalon 16 codes de classe et d'invitation : 10 essais par compte et par jour) ; sessions révocables (« tous mes appareils », fermeture générale en cas d'incident) et plus courtes pour les rôles sensibles.
- **Secrets** : hors du dépôt ; une configuration recopiée d'un modèle est refusée ; `pnpm verifier:production` contrôle la configuration avant toute mise en service, sans jamais afficher une valeur.
- **Navigateur** : politique de contenu stricte (scripts autorisés un par un), pas d'affichage dans un autre site, cookies sécurisés.
- **Journaux** : toute la console du serveur est nettoyée (numéros, emails, adresses, identifiants, jetons) ; journal d'audit pseudonymisé.
- **Coûts et abus** : plafond par agent et par jour, avec suspension automatique ; quotas par élève ; interrupteur d'accès des élèves.
- **Détresse** : alerte immédiate à l'équipe de veille, avec relances tant qu'elle n'est pas prise en charge.
- **Revue de sécurité** faite avant le pilote (`docs/securite/revue-jalon-5.md`), et ses 9 décisions appliquées (ADR 0049) ; seconde revue au Jalon 16 (`docs/securite/revue-jalon-16.md`) : aucun constat critique ni élevé, corrections appliquées et garde-fous automatiques sur les droits de la base (ADR 0092).

## 7. Risques pour les mineurs

| #   | Risque                                                                             | Mesures en place                                                                                                                                                        | Risque restant, question                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Un élève exprime une détresse (tristesse, idées noires, violence subie)            | L'agent oriente vers un adulte de confiance, ne conseille rien lui-même, crée un signalement prioritaire ; l'équipe de veille est alertée sans délai ; procédure écrite | Obligation de signaler à une autorité, et à laquelle ? Délai ? (Q10)                                                                                       |
| R2  | L'élève écrit spontanément des données personnelles ou sensibles dans une question | Les agents ne demandent jamais de données ; échanges effacés à 365 jours une fois la purge planifiée                                                                    | Masquage fait pour le Professeur, l'Évaluateur et le Tuteur (numéros, emails, liens ; pas les noms) : suffisant ? Durée de 365 jours acceptable ? (Q8, Q7) |
| R3  | Faux accord parental (l'élève saisit son propre numéro)                            | Lien envoyé au contact saisi ; formulaire papier de participation signé par le parent et gardé par l'établissement                                                      | Le papier suffit-il à couvrir ce risque ? Faut-il les deux parents ? (Q4)                                                                                  |
| R4  | Âge de la majorité ou de consentement numérique inconnu                            | Tout élève est traité comme mineur                                                                                                                                      | Quel âge retenir ? (Q4)                                                                                                                                    |
| R5  | Contenu inexact ou inadapté (santé, reproduction, histoire récente)                | Validation humaine de chaque contenu ; garde-fous par matière ; signalement d'erreur par les élèves et par l'Évaluateur                                                 | Responsabilité en cas d'erreur pédagogique ? (Q13)                                                                                                         |
| R6  | L'IA fait le travail à la place de l'élève (triche, dépendance)                    | L'agent guide sans donner la réponse et ne rédige jamais à la place de l'élève ; tests automatiques de ces règles                                                       | —                                                                                                                                                          |
| R7  | Comparaison, profilage, notation cachée                                            | Interdits par les règles ; aucun classement ; statistiques seulement agrégées, à partir de 5                                                                            | —                                                                                                                                                          |
| R8  | Données hors du Gabon                                                              | Minimisation ; aucune identité envoyée au modèle d'IA                                                                                                                   | Formalités, pays et garanties requis (Q5, Q6)                                                                                                              |
| R9  | Contact non souhaité des parents                                                   | Rapports seulement avec un accord séparé, arrêt en un geste, une demande par jour au plus ; rappels désactivés par défaut                                               | —                                                                                                                                                          |
| R10 | Image ou voix d'une personne réelle                                                | Avatars de synthèse seulement                                                                                                                                           | (Q15)                                                                                                                                                      |

## 8. Questions au juriste

**Cadre et formalités**

- **Q1** Quels textes s'appliquent ? Nous pensons à la loi gabonaise sur la protection des données à caractère personnel (référence à confirmer, loi n° 001/2011) et à l'autorité de contrôle (CNPDCP). Une déclaration ou une autorisation préalable est-elle exigée, et sous quelle forme pour ce registre ?
- **Q2** Qui doit être déclaré responsable du traitement, et faut-il un représentant au Gabon ?
- **Q3** Quel accord faut-il de l'établissement et, le cas échéant, de l'autorité académique (convention, forme) ?

**Mineurs et consentement**

- **Q4** Quel âge de la majorité, ou de consentement numérique, retenir ? L'accord d'un seul parent suffit-il ? Le lien envoyé par SMS ou email, complété du formulaire papier, est-il une forme valable ? Combien de temps l'établissement garde-t-il le papier ?

**Transferts et sous-traitants**

- **Q5** Les transferts hors du Gabon (§4) sont-ils permis ? Vers quels pays, et avec quelles garanties ?
- **Q6** Que doivent contenir les contrats avec chaque sous-traitant (lieu, durée de conservation, réutilisation des données pour entraîner un modèle) ?

**Durées et suppression**

- **Q7** Valider ou corriger les durées du pack :
  - échanges avec le professeur : 365 jours ;
  - inscription non confirmée : 30 jours ;
  - compte inactif : 730 jours ;
  - à fixer : signalements traités, tickets résolus, candidats clos, rapports aux parents.
- **Q8** Les numéros, emails, liens et identifiants écrits par les élèves sont maintenant masqués avant l'envoi au modèle d'IA (Professeur, Évaluateur, Tuteur, Support, Recruteur) ; les noms ne le sont pas. Ce masquage est-il suffisant, ou faut-il aller plus loin (par exemple, avertir l'élève avant l'envoi) ?
- **Q9** À la suppression d'un compte, le résumé d'un signalement (parfois une détresse) doit-il être effacé ou gardé, détaché du compte ? Et combien de temps ?

**Détresse**

- **Q10** En cas de détresse ou de danger pour un mineur, quelles sont les obligations de signalement de l'équipe, à qui et dans quel délai ? La procédure (`docs/pilote/procedure-detresse.md`) est-elle suffisante ?

**Information et droits**

- **Q11** La fiche d'information est-elle complète ? Faut-il une mention particulière avant le questionnaire anonyme ?
- **Q12** Comment les parents, sans compte, exercent-ils leurs droits ? Le passage par l'enfant ou par l'équipe suffit-il ?

**Responsabilités et contrats**

- **Q13** Quelle responsabilité en cas d'erreur d'un contenu validé, ou d'une réponse de l'IA ?
- **Q14** Un enseignant du public peut-il être référent (activité annexe, autorisation) ? Quelle forme de contrat, et à qui appartiennent les contenus validés et générés ? Peut-on utiliser les programmes de l'IPN ?
- **Q15** Si une personne réelle prêtait un jour sa voix ou son image : quelle forme d'autorisation ?
- **Q16** Recrutement : peut-on contacter des enseignants par leur email professionnel, trouvé par recommandation ou dans un réseau professionnel ? Avec quelles mentions ?
- **Q17** SMS applicatifs : faut-il une formalité auprès de l'ARCEP ou des opérateurs ?
- **Q18** En cas de fuite de données : à qui notifier, et dans quel délai ? Le dossier de production prévoit de prévenir le juriste, puis l'autorité et les familles.

**Suivi par l'enseignant de la classe**

- **Q19** L'enseignant de la classe peut-il voir des chiffres d'ensemble de sa classe (T11), sans aucune donnée individuelle ? Faut-il l'accord des parents, ou une simple information suffit-elle ? Plus tard, pourrait-il voir l'avancement de chaque élève, et à quelles conditions ?

## 9. Documents joints

| Document                            | Pourquoi                                                         |
| ----------------------------------- | ---------------------------------------------------------------- |
| `docs/pilote/README.md`             | Dossier du pilote et ses 12 conditions                           |
| `docs/pilote/fiche-information.md`  | Information des familles (Q11)                                   |
| `docs/pilote/consentements.md`      | Accords demandés et modèle de formulaire papier (Q4)             |
| `docs/pilote/procedure-detresse.md` | Procédure de détresse (Q10)                                      |
| `docs/pilote/criteres-arret.md`     | Quand suspendre ou arrêter le pilote                             |
| `docs/securite/revue-jalon-5.md`    | Revue de sécurité et ses décisions                               |
| `docs/production/README.md`         | Hébergement, sauvegardes, incident (§8 du dossier de production) |
| `docs/fournisseurs-2026-10.md`      | Fournisseurs envisagés et leurs conditions                       |
| `referentiels/gabon/pays.yaml`      | Durées de conservation proposées (Q7, Q9)                        |
