# Revue de sécurité et de confidentialité — Jalons 16 à 23

**Date** : 2026-11-12 · **Jalon 24, étape 1** (ADR 0119) · **Corrections** : S10, S11, S13 à S24 appliquées le 2026-11-12 (étape 2, ADR 0120) ; S12 et D18 attendent vos décisions (§5) · **Auteur** : Claude Code · **À relire par** : le propriétaire.

**Périmètre** : tout ce qui a changé depuis la revue du Jalon 16 (commit `c144185`), soit 82 fichiers, plus les migrations 0047 et 0048 arrivées juste après elle :

- **base** : migrations 0047 à 0050 (garde-fous de la revue précédente, capacité des classes, chapitre « commencé », mot du pays pour les séries, `mes_classes()` redéfinie) ;
- **application** : pages et actions nouvelles ou modifiées (classes et capacité, « Ce qui vous attend », sort des données, semaine, catalogue, espace, enseignant, inscription, tableau de bord) ;
- **téléphone** : service worker et copies gardées hors ligne (décision D14) ;
- **scripts** : `base:fuseau`, `verifier:production`, `paquet --pays`, `pack:nouveau`, `pack:verifier`, `verifier:liens`, `controler`, crochet avant envoi, entraînement du référent, tenue en charge ;
- **dépôt public** : flux GitHub, Dependabot, CodeQL, historique git, `.gitignore`, `.claude/settings.json`.

La grille est celle des revues des Jalons 5 et 16.

**Méthode** :

- trois relectures indépendantes, en lecture seule (base ; application et téléphone ; scripts et dépôt public) ;
- contrôle mécanique sur une base locale migrée ;
- chaque constat retenu ici a été **revérifié dans le code par Claude Code** ; le contournement de S11 a été reproduit.

**Aucune donnée réelle, aucun secret lu** : la recherche de secrets dans l'historique n'a affiché que des noms de fichiers.

## 1. En bref

**Aucun constat critique ni élevé.** Les règles des revues précédentes tiennent :

- les 157 fonctions privilégiées de la base ont un `search_path` fixé ;
- aucune n'est exécutable par `public` ;
- le rôle visiteur n'exécute que les 14 fonctions prévues ;
- les 63 tables ont toutes des règles d'accès ;
- chaque nouvelle page vérifie le rôle côté serveur ;
- les flux GitHub ont des droits minimaux et des actions épinglées ;
- aucun secret ni donnée réelle n'est dans l'historique.

La revue relève **1 constat moyen, 7 faibles et 7 pour information**. Les corrections sans décision passent à l'étape 2. Deux **décisions** vous reviennent (D17 et D18, §5).

| Gravité     | Nombre | Constats                                                                                                                                                                                                                                                                                               |
| ----------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Critique    | 0      | —                                                                                                                                                                                                                                                                                                      |
| Élevé       | 0      | —                                                                                                                                                                                                                                                                                                      |
| Moyen       | 1      | S10 (copies hors ligne gardées après la suppression du compte)                                                                                                                                                                                                                                         |
| Faible      | 7      | S11 (garde-fou « base locale » contournable), S12 (appareil révoqué mais hors ligne), S13 (« commencé » hors du programme), S14 (traitement « commencé » non documenté), S15 (clé API visible de toute la tâche), S16 (jeton GitHub laissé après checkout), S17 (clé privée `age` non ignorée par git) |
| Information | 7      | S18 à S24                                                                                                                                                                                                                                                                                              |

## 2. Ce qui a été vérifié et tient

- **Base** :
  - 157 fonctions `security definer` (154 au Jalon 16), toutes avec `search_path` fixé, aucune exécutable par `public` ; la correction S6 du Jalon 16 est bien appliquée ;
  - le rôle visiteur (`anon`) exécute exactement les 14 fonctions de la liste blanche du garde-fou GF02, et ne lit que le catalogue ;
  - les fonctions redéfinies par `drop` puis `create` (`classes_admin`, `mes_classes`) gardent exactement leurs droits d'origine et leur filtre ; `rejoindre_classe` garde le contrôle pays, niveau et série ;
  - les fonctions internes du chapitre « commencé » n'ont aucun droit d'exécution, et leur déclencheur ne peut pas être détourné ;
  - l'alerte « classe complète » ne nomme aucun élève ; la vue de l'enseignant reste agrégée et masquée sous 5 ;
  - `serveur_application` n'est ni superutilisateur, ni créateur de rôles ou de bases, ne contourne pas les règles d'accès et n'hérite d'aucun droit.
- **Application** :
  - toutes les nouvelles pages d'administration commencent par `exigerAdministrateur()`, et les pages d'élève par `exigerEleveActif()` ;
  - les paramètres d'adresse (classe, série, date de semaine, version) sont comparés à des listes du pays de l'élève ou validés ;
  - aucune nouvelle sortie ne renvoie le texte d'une erreur SQL ni ne révèle l'existence d'un compte ;
  - les nouvelles fonctions serveur utilisent le bon rôle : visiteur pour la date et le mot du pays, utilisateur pour le reste ;
  - en-têtes et politique de contenu inchangés depuis le Jalon 16.
- **Téléphone** :
  - seules sont gardées les pages prévues par D14 (Mes cours, matière, chapitre, plan, correction d'un quiz déjà fait) : jamais une page d'administration, de référent, d'enseignant, de parent ou d'API, jamais un quiz à faire ;
  - les copies sont propres à chaque compte (nom du cache dérivé de l'utilisateur), effacées à la déconnexion et à toute nouvelle connexion, et périmées après 7 jours.
- **Scripts** :
  - `base:fuseau` : requête paramétrée, fuseau validé par Postgres, aucune adresse affichée ;
  - `verifier:production` : transaction en lecture seule, au nom d'un visiteur, sans afficher de valeur ;
  - `pack:nouveau` : le nom de dossier exclut `../`, les chemins absolus et `_` ; rien n'est écrasé ;
  - `paquet --pays` : refuse `_`, `/`, un pack introuvable ou de test ; l'effacement de sortie reste protégé ;
  - aucun script ne passe une saisie à un shell.
- **Dépôt public** :
  - droits `contents: read` partout, `security-events: write` seulement pour CodeQL ; actions épinglées par empreinte (test) ; ni `pull_request_target` ni `workflow_run` ; aucun secret dans les flux d'une demande de fusion ; saisies manuelles validées ;
  - historique (183 commits) : aucun `.env`, aucune clé, aucune sauvegarde ; les motifs de clés ne trouvent qu'une donnée de test fictive ;
  - `.claude/settings.json` : toutes les interdictions de lecture des secrets sont présentes.

## 3. Constats

### S10 — Copies hors ligne gardées après la suppression du compte · **moyen**

- **Où** : `application/src/app/espace/mes-donnees/actions.ts` (`supprimerMonCompte`) et `formulaire-suppression.tsx`.
- **Ce qui se passe** : la suppression ferme la session puis redirige vers l'accueil, sans effacer les copies du téléphone. La déconnexion, elle, les efface (`effacerDonneesLocales()`). L'accueil ne les efface pas non plus.
- **Ce qui reste**, jusqu'à 7 jours ou jusqu'à la prochaine page de connexion : les chapitres avec la conversation de l'élève avec le Professeur IA, ses corrections de quiz et ses contestations, son plan de révision.
- **Scénario** : un élève supprime son compte depuis le téléphone familial. Un frère passe le téléphone en mode avion et relit tout. L'élève croyait ses données effacées : la promesse de « Mes données » n'est pas tenue sur l'appareil.
- **Pourquoi moyen** : des textes libres d'un mineur restent lisibles par un tiers, contre son attente explicite.
- **Correction (étape 2)** : effacer les copies avant l'envoi de la suppression, comme pour la déconnexion ; et effacer aussi, par précaution, sur toute page publique quand aucune session n'est ouverte. Test de bout en bout.

### S11 — Le garde-fou « base locale seulement » se contourne · **faible**

- **Où** : `application/src/lib/exploitation/entrainement.ts` (`estBaseLocale`, utilisée par `pnpm entrainement:referent`) et `application/scripts/tenue-en-charge.mts` (simple expression régulière).
- **Cause, reproduite** : le pilote Postgres fait primer le paramètre `?host=` sur l'hôte de l'adresse. `postgresql://postgres@127.0.0.1:54330/postgres?host=base.distante` est jugée « locale » par les deux contrôles, mais la connexion part vers `base.distante`.
- **Scénario** : une adresse de production écrite sous cette forme ; la tenue en charge y écrirait des élèves fictifs, l'entraînement une invitation. Cela suppose une adresse bricolée, pas une simple erreur.
- **Correction (étape 2)** : décider sur l'hôte que le pilote utilisera vraiment (même analyseur), refuser tout `host`/`hostaddr` en paramètre et tenir compte de `PGHOST` ; une seule fonction pour les deux scripts ; tests avec les adresses piégées.

### S12 — Appareil révoqué mais resté hors ligne · **faible**

- **Où** : `application/public/sw.js` ; « Déconnecter mes appareils », suspension, fin de session.
- **Ce qui se passe** : un téléphone resté sans réseau sert encore ses copies (au plus 7 jours) ; elles s'effacent dès que le réseau revient. Sans réseau, aucun moyen technique de les effacer à distance : c'est une limite qui découle de D14.
- **Scénario** : un élève perd son téléphone, puis utilise « Déconnecter mes appareils ». La personne qui l'a trouvé, hors réseau, relit ses pages jusqu'à 7 jours.
- **Suite** : **décision D17** (§5).

### S13 — « Commencé » noté pour un chapitre hors du programme de l'élève · **faible**

- **Où** : migration 0049, `noter_visionnage`.
- **Ce qui se passe** : la fonction marque « commencé » tout chapitre validé, de n'importe quel pays ou niveau, et avant le contrôle du quota.
- **Scénario** : un élève envoie lui-même des identifiants de chapitres d'un autre pays ; sa progression se remplit de lignes sans rapport, et le Tuteur travaille sur des données faussées. Aucune donnée d'un autre élève n'est touchée ; la vue de l'enseignant ne compte que les chapitres de la classe.
- **Correction (étape 2)** : n'accepter que les chapitres du référentiel de l'élève (les autres classes de son pays restent permises : il peut y revoir un prérequis) et noter après le quota. Test PC05.

### S14 — Traitement « commencé » non documenté · **faible**

- **Où** : commentaire de `application/src/app/api/mesures/visionnage/route.ts` (« rien n'est gardé sur l'élève »), ADR 0103 (« aucune donnée nouvelle »), registre du dossier pour le juriste.
- **Ce qui se passe** : depuis la décision D15, ouvrir une leçon écrit une ligne de progression nominative. Le traitement est utile et voulu, mais décrit comme inexistant.
- **Correction (étape 2)** : corriger le commentaire et l'ADR. Vérification faite à l'étape 2 : le registre du dossier pour le juriste (T3) décrivait déjà ce traitement.

### S15 — Clé API visible de toute la tâche « passage réel » · **faible**

- **Où** : `.github/workflows/tests-agents.yml`, tâche `passage-reel`.
- **Ce qui se passe** : `ANTHROPIC_API_KEY` est posée pour toute la tâche, installation des dépendances comprise, et pas seulement pour l'étape qui l'utilise. Limité par : pnpm bloque les scripts d'installation, la tâche ne tourne jamais pour une demande de fusion venue d'un autre dépôt, et la clé n'est pas encore posée.
- **Correction (étape 2)** : ne la donner qu'aux étapes qui en ont besoin.

### S16 — Jeton GitHub laissé sur le disque après le checkout · **faible**

- **Où** : tous les `actions/checkout` des trois flux.
- **Ce qui se passe** : sans `persist-credentials: false`, le jeton du flux reste dans `.git/config`, lisible par le code exécuté ensuite (tests, dépendances). Il est en lecture seule, sauf pour CodeQL.
- **Correction (étape 2)** : `persist-credentials: false` partout, exigé par le test des flux.

### S17 — Clé privée `age` et sauvegardes non ignorées à la racine · **faible**

- **Où** : `.gitignore` de la racine.
- **Ce qui se passe** : `sauvegardes/` et `*.dump` ne sont ignorés que dans `application/`, et `cle-sauvegardes.txt`, le nom de la clé privée donné par le dossier de production, nulle part. Une sauvegarde lancée depuis la racine, ou la clé posée là, partirait dans le dépôt public au prochain `git add -A`.
- **Correction (étape 2)** : ignorer `sauvegardes/`, `*.dump`, `*.age` et `cle-sauvegardes*` partout. Pour Claude Code lui-même : **décision D18** (§5).

### Pour information (sans scénario d'abus réaliste)

| #   | Constat                                                                                                                                            | Suite proposée                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| S18 | Capacité de classe : comptage puis rattachement sans verrou ; deux élèves simultanés peuvent dépasser la capacité d'une place.                     | Verrou sur la classe (étape 2, petit).                        |
| S19 | Le garde-fou GF03 ne voit pas les droits accordés colonne par colonne au visiteur.                                                                 | Étendre GF03 (étape 2).                                       |
| S20 | Mot du pays pour les séries sans longueur maximale en base (il vient du pack et est échappé partout).                                              | Contrainte de longueur (étape 2, facultatif).                 |
| S21 | Les copies hors ligne sont servies sans politique de contenu ni en-têtes de sécurité (déjà le cas depuis le Jalon 5).                              | Défense en profondeur : garder l'en-tête d'origine (étape 2). |
| S22 | `/administration/classes` affiche un message d'erreur pris dans l'adresse (échappé, 200 caractères) : un lien piégé peut afficher un faux message. | Code d'erreur dans l'adresse, texte côté serveur (étape 2).   |
| S23 | Deux numéros réalistes (formats gabonais et français) dans un test unitaire de normalisation, contre la convention `+999`.                         | Les remplacer (étape 2).                                      |
| S24 | Masquage des rapports de contrôle : `DATABASE_URL` et un mot de passe hors adresse complète ne sont pas masqués (aucun secret réel en CI).         | Élargir le masquage (étape 2).                                |

Déjà connu et suivi ailleurs : 4 commits du 2026-10-04 portent une adresse email personnelle (guide des réglages GitHub, étape 4 ; pas de réécriture d'historique).

## 4. Non vérifié

- La base de production, dont la fermeture effective de l'API de données (contrôlée par `pnpm verifier:production` le jour du déploiement).
- Les en-têtes réellement servis en production (contrôlés par `pnpm verifier:site`).
- Les réglages réels du dépôt GitHub et les artefacts déjà publiés (`pnpm verifier:depot` pour les réglages).

## 5. Décisions du propriétaire

**D17 — Copies hors ligne d'un appareil révoqué (S12).** Sans réseau, rien ne peut effacer les copies à distance ; elles s'effacent dès que le réseau revient, au plus tard après 7 jours.

| Choix                                                                                                                                                                                     | Effet                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **a. Le dire clairement (recommandé)** : dans « Mes données », près de « Déconnecter mes appareils », et dans la fiche d'information des familles ; question déjà posée au juriste (Q20). | Aucune perte d'usage hors ligne ; chacun sait ce qui reste sur un appareil perdu.                                                                  |
| b. Réduire à 2 jours la durée des pages qui contiennent un texte de l'élève (chapitre avec conversation, correction de quiz), en plus de a.                                               | Moins d'exposition, mais un élève sans réseau plus de 2 jours perd ses chapitres annotés.                                                          |
| c. Ne plus garder hors ligne les pages qui contiennent un texte de l'élève.                                                                                                               | Exposition nulle pour ces textes ; le hors ligne ne garde plus que les leçons sans conversation, les listes et le plan. Revient en partie sur D14. |

**D18 — Interdire à Claude Code la lecture de la clé privée de sauvegarde (S17).** `.claude/settings.json` interdit déjà la lecture des secrets ; ajouter `cle-sauvegardes*`, `*.age` et `sauvegardes/` à ces interdictions. **Recommandé : oui.** C'est votre fichier de règles : je ne le modifie qu'avec votre accord.
