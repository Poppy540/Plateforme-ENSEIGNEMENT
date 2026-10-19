# Revue de sécurité et de confidentialité — Jalon 5, étape 0

**Date** : 2026-10-21 · **Portée** : tout le dépôt (base de données, authentification et sessions, routes et actions du serveur, données personnelles et agents). **Méthode** : quatre relectures indépendantes en lecture seule, puis vérification de chaque constat dans le code par Claude Code avant correction. Les secrets n'ont pas été lus (seuls les modèles `*.example`). **Décision** : ADR 0043.

**Bilan** : aucun constat critique. Les règles d'accès de la base, les validations humaines, les jetons et les rôles des agents sont solides. Deux constats élevés ont été corrigés ; les autres sont corrigés ou laissés à votre décision (§3).

## 1. Constats corrigés

| # | Gravité | Constat | Correction | Test |
|---|---|---|---|---|
| S1 | **Élevée** | Un mineur pouvait éviter l'accord parental en envoyant « majeur=oui » : le formulaire masquait la case, mais ni le serveur ni la base ne vérifiaient. Au Gabon, l'âge de la majorité est inconnu : tout élève doit être traité comme mineur. | La base refuse « majeur » quand le pack ne fixe pas l'âge ; le serveur lit l'âge dans le référentiel au lieu de croire le formulaire. | S01 |
| S2 | **Élevée** (si l'API de données de Supabase était ouverte) | `inscrire_eleve` et `demander_consentement_rapports` rendaient le jeton du parent en clair à la session de l'élève : par l'API Supabase, un élève aurait pu valider lui-même son inscription ou les rapports. | Ces fonctions ne rendent plus que l'identifiant de la demande. Le jeton est émis une seule fois par le service de messagerie (`emettre_jeton_consentement`), qui l'envoie au parent. | T14, RP01 |
| S3 | Moyenne | Toute personne connectée pouvait tester si une adresse figure dans la liste d'opposition du recrutement. | Droit retiré. | S02 |
| S4 | Moyenne | Quotas d'appels au modèle comptés après coup : plan du Tuteur et corrections de quiz rejouables sans limite, Professeur dépassable par envois simultanés, questions des parents sans quota. | Quota par élève, nature et jour pris **avant** l'appel et gardé s'il échoue (`prendre_quota_eleve`, `prendre_quota_parent`) ; verrou par élève pour le Professeur. | S03 |
| S5 | Faible | Un élève pouvait insérer directement un signalement (priorité 1, dates, traitant forgés) et tester l'accord d'un autre élève. | Insertion directe et test d'accord retirés aux sessions (les signalements passent par les agents). | S02 |
| S6 | Moyenne | Les liens des rapports aux parents ne s'éteignaient jamais, et le rapport restait lisible après l'arrêt. | Lien valable 60 jours ; contenu illisible après l'arrêt ; plus de question au Tuteur sans accord actif. | RP03 |
| S7 | Moyenne | Un élève pouvait faire envoyer des messages en boucle à un numéro (retirer puis redemander l'accord aux rapports). | Une demande par jour au plus. | RP04 |
| S8 | Faible | La Conformité lisait les prérequis de tous les référentiels ; une décision restait possible sur un rapport de cohérence déjà traité. | Prérequis limités à son référentiel ; décision refusée sur un rapport traité. | S04, S05 |
| S9 | Moyenne | Aucune limite d'envoi ni d'essai des codes de connexion côté plateforme : épuisement du quota de SMS de tous, SMS coûteux, essais de code. | Limites tenues en base : 3 codes par numéro ou email et par 15 minutes, 200 par heure pour la plateforme, 5 essais faux par 15 minutes (réglables). | S06 |
| S10 | **Élevée** (configuration) | Le modèle de configuration mettait `ENVIRONNEMENT=developpement` : en le recopiant, un serveur public aurait accepté le code fixe 123456, affiché la boîte de messages simulée (liens d'accord des parents) et signé les sessions avec un secret public. | Modèle en `production`. La simulation n'est plus possible que sur un poste local (adresse publique locale). Un secret de session ou un sel recopié du modèle (« remplacer-moi ») est refusé. Cookies `Secure` dès qu'on n'est pas en simulation. | tests de configuration |
| S11 | Moyenne | Aucun en-tête de sécurité : la page d'un référent pouvait être affichée dans un cadre d'un autre site (clic détourné sur « valider ») ; pas de politique de référent. | Politique de contenu (`frame-ancestors 'none'`, sources limitées au site), `X-Frame-Options`, `Referrer-Policy: same-origin`, `nosniff`, `Permissions-Policy`. | bout en bout |
| S12 | Faible | Le dépôt d'un PDF sans taille annoncée était lu en entier en mémoire. | Taille annoncée obligatoire. | — |
| C1 | Moyenne | Le résumé d'un ticket du Support ne masquait que les chiffres ; le texte d'un candidat partait au modèle avec ses numéros et emails. | Masquage commun des numéros, emails et liens (Support, Recruteur : informations envoyées au modèle et résumé des signalements). | unitaire |
| C2 | Faible | Le contact du parent restait enregistré après l'arrêt des rapports. | Effacé à l'arrêt (par l'élève ou par le parent). | — |

## 2. Points vérifiés et sains

- Toutes les tables ont des règles d'accès au niveau des lignes ; toutes les fonctions privilégiées fixent leur `search_path` et retirent le droit d'exécution par défaut.
- Personne ne peut élever son propre rôle ; validation, publication et production vidéo exigent le référent de la famille et la version relue.
- Les agents reçoivent leur contexte (élève, unité, document, candidat) du serveur, jamais d'un identifiant saisi.
- Jetons : environ 244 bits d'aléa, conservés seulement sous forme d'empreinte, à usage unique ; codes d'invitation à durée limitée.
- Sessions signées (comparaison à temps constant), cookies `HttpOnly` et `SameSite=Lax` ; chaque page et action vérifie le rôle.
- Exécuteur planifié protégé par jeton (comparaison à temps constant) ; aucune redirection ouverte, aucune requête vers une adresse saisie.
- Les prompts du Professeur, du Tuteur, du Support et des rapports aux parents ne contiennent ni nom, ni téléphone, ni email ; les journaux ne contiennent ni contenu ni identifiant.

## 3. Points laissés à votre décision (non corrigés)

| # | Point | Proposition |
|---|---|---|
| D1 | **API de données de Supabase** : l'application ne l'utilise pas (accès direct à Postgres, ADR 0015). Ouverte, elle exposerait toutes les fonctions accordées aux sessions. | Exiger à la mise en production que le schéma `public` ne soit **pas** exposé par l'API (dossier de production, étape 2). |
| D2 | **Signalements et tickets après la suppression d'un compte** : l'identifiant est effacé mais le résumé rédigé par l'agent (parfois une détresse) reste. | Avec le juriste : effacer ou réécrire le résumé à la suppression, ou supprimer les signalements traités après un délai. |
| D3 | **La purge ne couvre que les échanges et les comptes**, et elle n'est pas planifiée. Restent : signalements, tickets, tâches, candidats refusés, messages et dossiers de recrutement, autorisations voix/image, documents officiels, rapports. | Fixer des durées dans `pays.yaml` (avec le juriste), puis étendre et planifier la purge (étape 2). |
| D4 | Empreinte de la liste d'opposition **sans sel secret** : une adresse devinable peut être retrouvée. | Ajouter un sel secret (`SEL_OPPOSITION`, rempli par vous hors dépôt). |
| D5 | SMS de connexion envoyables vers **n'importe quel pays**. | Liste des indicatifs autorisés dans le pack pays. |
| D6 | Sessions sans révocation côté serveur (30 jours) ; même durée pour élèves, référents et administration. | Révocation en base et sessions plus courtes pour les rôles sensibles. |
| D7 | Un référent lit toutes les approbations (commentaires compris) et les résumés des signalements de ses chapitres (avec l'identifiant de l'élève). | Limiter aux familles du référent ; décider si le référent doit voir l'élève concerné. |
| D8 | Politique de contenu avec `'unsafe-inline'` pour les scripts (imposé par Next.js sans nonce). | Politique à nonce, au moment de la mise en production. |
| D9 | Documents officiels déposés jamais supprimables ; export « Mes données » réservé aux élèves. | Fonction de suppression par le propriétaire ; export pour référents et administration. |
