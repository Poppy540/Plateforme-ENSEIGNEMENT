# Revue de sécurité et de confidentialité — Jalons 9 à 15

**Date** : 2026-10-29 · **Jalon 16, étape 1** (ADR 0091) · **Corrections** : S1, S4, S5, S6, S7 et garde-fous appliqués le 2026-10-30 (étape 2, ADR 0092) ; D10 à D12 en attente du propriétaire. · **Auteur** : Claude Code · **À relire par** : le propriétaire.

**Périmètre** :

- migrations 0034 à 0046 : rôle enseignant, classes, invitations, chapitres du pilote, files d'approbation, conditions, critères, journal, semaine, fin, clôture, sort des données ;
- fonctions et pages d'administration ajoutées depuis le Jalon 9, routes d'export, exécuteur planifié ;
- masquage des textes libres ;
- outils d'exploitation : migrations suivies, sauvegarde, paquet, répétition, vérification de site.

La grille est celle de la revue du Jalon 5 (`revue-jalon-5.md`).

**Méthode** :

- contrôle mécanique sur une base locale migrée : toutes les fonctions `security definer`, leurs droits d'exécution et leur `search_path` ; règles d'accès de chaque table ; droits du rôle visiteur (`anon`) ;
- relecture des 62 définitions de fonctions privilégiées des migrations 0034 à 0046 (certaines sont redéfinies d'une migration à l'autre) ;
- relecture du code serveur (routes, actions, sessions, codes, exports) et des scripts d'exploitation.

**Aucune donnée réelle, aucun secret lu.**

## 1. En bref

**Aucun constat critique ni élevé.** Les règles posées au Jalon 5 ont été suivies dans les Jalons 9 à 15 :

- les 154 fonctions privilégiées de la base ont toutes un `search_path` fixé ;
- toutes les tables ont des règles d'accès ;
- les fonctions d'administration vérifient le rôle en premier ;
- les chiffres sont agrégés et masqués sous 5 ;
- les codes ne sont stockés que sous forme d'empreinte.

La revue relève **2 constats moyens, 5 faibles et 2 pour information**. Les corrections sans décision passent à l'étape 2, avec des **garde-fous automatiques** pour que les prochaines migrations ne puissent pas oublier ces règles. Trois **décisions** vous reviennent (D10 à D12, §5).

| Gravité     | Nombre | Constats                                                                                                                                                                                                                                           |
| ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critique    | 0      | —                                                                                                                                                                                                                                                  |
| Élevé       | 0      | —                                                                                                                                                                                                                                                  |
| Moyen       | 2      | S1 (pas de limite d'essais sur les codes), S2 (code de classe partagé longtemps valable)                                                                                                                                                           |
| Faible      | 5      | S3 (inférence par différence chez l'enseignant), S4 (téléchargement noté par une simple requête), S5 (vérification de site incomplète), S6 (droit inutile sur une fonction de déclencheur), S7 (noms possibles dans les textes libres de l'équipe) |
| Information | 2      | S8 (chapitres du pilote lisibles par tout compte connecté), S9 (sauvegardes non chiffrées automatiquement)                                                                                                                                         |

## 2. Ce qui a été vérifié et tient

- **Fonctions privilégiées** :
  - les 154 fonctions `security definer` ont un `search_path` fixé ;
  - aucune ne laisse d'exécution à `public`, hormis une fonction de déclencheur (S6) ;
  - les fonctions des migrations 0034 à 0046 commencent toutes par une garde de rôle : `verifier_administrateur()`, appartenance à la classe, `auth.uid()`, ou rôle `agent_orchestrateur` seul ;
  - les seules exceptions sont des fonctions internes sans aucun droit d'exécution (`*_interne`, `noter_decision_pilote`, `familles_du_referentiel`).
- **Rôle visiteur (`anon`)** :
  - il ne lit que le catalogue : pays, référentiels, niveaux, séries, matières, unités, chapitres, prérequis ;
  - il n'exécute que les 15 fonctions prévues : liens des parents à jeton, connexion et session, catalogue, rôle courant ;
  - aucune fonction des Jalons 9 à 15 ne lui est ouverte.
- **Tables** : toutes ont la sécurité au niveau des lignes. Les nouvelles tables sont illisibles hors des fonctions d'administration : périodes, conditions, critères, journal, gestes, alertes.
- **Enseignant** : la vue de classe ne renvoie que des agrégats. Rien n'apparaît sous 5 élèves, chaque compte de 1 à 4 est masqué, et la moyenne ne s'affiche qu'à partir de 5 élèves. L'accès est limité aux classes de l'enseignant.
- **Codes** (invitations de référent et d'enseignant, classes) :
  - environ 59 bits d'entropie (12 caractères parmi 31), tirés par `randomInt` ;
  - stockés en empreinte SHA-256, montrés une seule fois ;
  - invitations à usage unique avec expiration ;
  - création et annulation tracées.
- **Textes libres de l'administration** (preuves, motifs, journal) : longueurs bornées en base, numéros et emails masqués avant l'enregistrement. Le journal d'audit ne garde que des codes, des dates et des motifs déjà masqués, jamais la preuve.
- **Rapports et exports** :
  - réservés à l'administration, en-tête `no-store` ;
  - la version établissement exclut les coûts, les agents, les critères et le journal ;
  - aucun identifiant ni numéro dans les fichiers, ce que vérifient les tests de bout en bout.
- **Exécuteur planifié** : protégé par un jeton comparé en temps constant. Ses nouvelles alertes ne contiennent aucune donnée d'élève, et un test le vérifie.
- **Sessions** :
  - cookie `HttpOnly`, `SameSite=Lax`, signé ;
  - durée bornée par rôle : 12 h pour l'administration, 7 jours pour référent et enseignant, 30 jours pour l'élève ;
  - révocables en base (ADR 0049).
- **Exploitation** :
  - le paquet refuse tout `.env*`, `*.dump`, fichier de test ou pack fictif ;
  - la sauvegarde s'écrit avec `umask 077` dans un dossier en `700` ; `roles.sql` ne contient aucun mot de passe ;
  - la répétition tire des secrets fictifs jamais affichés et vérifie que le journal du serveur n'en contient aucun.

## 3. Constats

### S1 — Pas de limite d'essais sur la saisie des codes · **moyen**

`rejoindre_classe` (élève), `activer_enseignant` et l'activation d'une invitation de référent acceptent un nombre illimité d'essais. Les échecs ne sont pas tracés.

- **Risque** : la force brute est irréaliste à 59 bits, mais rien ne détecte une tentative répétée, et des codes plus courts ou mal recopiés pourraient être devinés.
- **Correction (étape 2)** :
  - un quota d'essais par compte et par jour, avec le mécanisme de quotas existant (10 essais par jour, réglable) ;
  - un message neutre au-delà ;
  - les échecs comptés dans le pilotage, sans le code saisi.

### S2 — Code de classe partagé, valable 30 jours · **moyen**

Le même code sert à toute la classe pendant 30 jours. S'il circule hors de la classe, un élève d'un autre établissement **du même niveau** peut la rejoindre.

- L'intrus ne voit que le nom de la classe : aucune donnée n'est exposée.
- En revanche, il fausse les chiffres d'ensemble de l'enseignant et peut faire passer la classe au-dessus du seuil de 5.
- **Mesures existantes** : nouveau code de classe en un clic (l'ancien est aussitôt invalide), départ possible de la classe.
- **Décision proposée** : D10 (§5).

### S3 — Inférence par différence dans la vue de l'enseignant · **faible**

Les chiffres sont recalculés à chaque lecture. Un enseignant qui compare deux lectures, juste avant et juste après le départ ou l'arrivée d'un élève connu, peut déduire quelques informations sur lui (chapitre terminé ou non). C'est une limite connue des agrégats ; le seuil de 5 la réduit sans l'éliminer.

- **Mesures existantes** : aucun nom, aucun chiffre sous 5, la question Q19 est posée au juriste.
- **Décision proposée** : D11 (§5).

### S4 — Le téléchargement du rapport de fin est noté par une simple requête · **faible**

`GET /api/administration/fin-pilote` note le geste de clôture « rapport téléchargé ». Le cookie de session est `SameSite=Lax` : un lien suivi depuis un autre site, ouvert par l'administrateur connecté, ferait donc le téléchargement **et** cocherait le geste.

- Aucune fuite : le fichier arrive chez l'administrateur.
- Seul l'état de la clôture peut être faussé.
- **Correction (étape 2)** : ne noter le téléchargement que pour une demande venue de la plateforme elle-même (en-tête `Sec-Fetch-Site: same-origin`, sinon `Referer` de même origine). Le fichier reste servi dans tous les cas.

### S5 — La vérification d'un site déployé ignore les nouvelles routes d'export · **faible**

`pnpm verifier:site` (ADR 0073) contrôle les refus sans session de `/api/mes-donnees`, `/api/professeur`, `/api/administration/export` et `/api/orchestrateur/executer`. Il ne contrôle pas `/api/administration/semaine` ni `/api/administration/fin-pilote`, ajoutées aux Jalons 13 et 14.

- **Correction (étape 2)** : les ajouter, avec un test unitaire.

### S6 — Droit d'exécution inutile sur une fonction de déclencheur · **faible**

`videos_avant_insertion` garde le droit d'exécution par défaut pour `public`. Une fonction de déclencheur ne peut pas être appelée directement : c'est sans effet, mais c'est l'exception à la règle « aucune fonction privilégiée ouverte à `public` ».

- **Correction (étape 2)** : révoquer ce droit, dans une migration.

### S7 — Noms possibles dans les textes libres de l'équipe · **faible**

Les preuves, motifs et entrées du journal du pilote ne masquent que les numéros et les emails. Un nom (d'un enseignant, d'un parent) peut y être écrit. L'écran demande « sans donnée personnelle ».

- Ces textes ne sont lus que par l'administration et figurent dans la version **équipe** des rapports, jamais dans la version établissement.
- **Correction (étape 2)** :
  - rappel dans le guide de mise en route et dans le dossier du juriste, au registre des traitements : « journal du pilote, textes de l'équipe » ;
  - aucune détection automatique des noms, trop peu fiable.

### S8 — Chapitres du pilote lisibles par tout compte connecté · **information**

`est_chapitre_pilote(chapitre)` répond à tout compte connecté. Elle ne révèle que l'appartenance d'un chapitre au pilote, ce qui n'est pas une donnée personnelle. **Accepté**, sans changement.

### S9 — Sauvegardes non chiffrées automatiquement · **information** (décision déjà ouverte)

La sauvegarde est protégée par les droits du système (`700`, `umask 077`), mais elle n'est pas chiffrée. Le dossier de production demande de la garder chiffrée hors du serveur, et le choix de l'outil était déjà attendu au bilan du Jalon 11.

- **Décision proposée** : D12 (§5).

## 4. Garde-fous automatiques (étape 2)

Ces contrôles seront ajoutés aux tests de base. Une future migration qui oublie une règle fera échouer `pnpm test:base`.

1. Toute fonction `security definer` du schéma `public` a un `search_path` fixé.
2. Aucune fonction `security definer` n'est exécutable par `public`, et seules les fonctions d'une **liste blanche justifiée** le sont par `anon` : les 15 d'aujourd'hui.
3. Toute table du schéma `public` a la sécurité au niveau des lignes activée.
4. `anon` n'a de droits de lecture que sur les tables du catalogue, inscrites sur une liste blanche.

## 5. Décisions proposées au propriétaire (étape 3)

| #   | Question                         | Choix                                                                                                                                                                                                                            | Recommandation                                                                                                      |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| D10 | Code de classe partagé (S2)      | **a)** garder 30 jours ; **b)** durée par défaut ramenée à 14 jours ; **c)** **capacité de la classe** saisie à la création (par exemple l'effectif annoncé), au-delà de laquelle le code est refusé et l'administration alertée | **c**, avec un nouveau code au besoin : l'intrusion devient visible et bornée, sans gêner les élèves                |
| D11 | Vue de l'enseignant (S3)         | **a)** chiffres à jour à chaque lecture (actuel) ; **b)** chiffres **gelés une fois par semaine**, ce qui réduit fortement l'inférence par différence                                                                            | Attendre la réponse du juriste à Q19 ; d'ici là, **a** (le pilote n'a pas commencé)                                 |
| D12 | Chiffrement des sauvegardes (S9) | **a)** outil `age` (libre, une clé publique sur le serveur, la clé privée hors du serveur) ; **b)** chiffrement fourni par l'hébergeur ; **c)** autre outil de votre choix                                                       | **a** si l'hébergeur ne chiffre pas lui-même. L'installer sur le serveur reste votre décision ; rien n'est souscrit |

## 6. Hors périmètre

- Un test d'intrusion externe, à envisager après le déploiement, avec votre accord sur le coût.
- La revue des fournisseurs réels (SMS, email, avatar, hébergeur), qui n'est possible qu'une fois choisis.
- Les dépendances : `pnpm audit` est à lancer au moment du déploiement, sur l'arbre exact déployé.
