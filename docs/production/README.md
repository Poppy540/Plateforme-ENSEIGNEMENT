# Dossier de mise en production

**Statut** : rédigé par Claude Code (Jalon 5, étape 2 ; ADR 0045). **Rien n'est déployé ni souscrit** : chaque étape se fait par le propriétaire, ou avec son accord explicite.

Ce dossier dit **comment** mettre la plateforme en service ; le [guide de mise en route](../mise-en-route.md) dit **dans quel ordre**. Le pilote reste soumis aux 12 conditions de [`docs/pilote/README.md`](../pilote/README.md) (juriste, établissement, référent, contenus validés, essais réels, veille). Ce dossier couvre surtout les conditions 6, 7, 8 et 12.

## 1. Décisions préalables (propriétaire)

| Décision | Proposition | Référence |
|---|---|---|
| Hébergement de l'application | Vercel Pro (le plus simple) ou Cloudflare Workers (gratuit au départ, à essayer : la connexion Postgres directe y demande un relais) | `docs/fournisseurs-2026-10.md` §5 |
| Vidéo | Cloudflare Stream pour l'hébergement (stack validée) ; fournisseur d'avatar **synthétique** à choisir, branché par la passerelle du §3 bis ; budget par vidéo `BUDGET_VIDEO_USD` | ADR 0025, 0055 |
| SMS (codes de connexion, parents, veille) | Twilio au démarrage (seul fournisseur relevé pour le Gabon), puis un agrégateur local par la passerelle HTTP | §4 ; ADR 0045 |
| Email | Brevo (ou un autre, par la passerelle HTTP) | ADR 0045 |
| Région des données (Supabase) | À fixer avec le juriste (transferts hors du Gabon) | Revue de sécurité D3 |
| Durées de conservation complètes | À fixer avec le juriste, puis à mettre dans `pays.yaml` | Revue de sécurité D2, D3 |
| Budget | Modèles, SMS, hébergement ; plafond journalier `COUT_JOUR_MAX_AGENT_USD` | Pilote, condition 11 |

## 2. Supabase (base et authentification)

1. **Projet** : un projet de production distinct de tout essai, région décidée avec le juriste. Plan avec sauvegardes quotidiennes (et restauration à un instant donné si le budget le permet).
2. **API de données fermée** (revue de sécurité, D1) : dans les réglages de l'API, retirer `public` des schémas exposés ou désactiver l'API de données. L'application n'en a pas besoin : elle se connecte directement à Postgres (ADR 0015). Ouverte, elle exposerait des fonctions prévues pour le serveur.
3. **Authentification** : connexion par téléphone (fournisseur SMS configuré **dans Supabase**, qui envoie les codes) et par email (code à 6 chiffres). Garder les limites d'envoi de Supabase ; l'application ajoute les siennes (ADR 0043). Elle n'envoie de code qu'aux indicatifs des packs importés (ADR 0049) : restreindre **aussi** les pays dans le fournisseur SMS de Supabase, car un appel direct à Supabase ne passe pas par l'application.
4. **Rôles** : donner un mot de passe long au rôle `serveur_application` (connexion de l'application, `URL_BASE_DONNEES`). Garder une connexion d'administration séparée pour les migrations et la purge (`URL_BASE_DONNEES_ADMIN`), jamais utilisée par l'application ni par un agent.
5. **Migrations** (ADR 0075) : `URL_BASE_DONNEES_ADMIN=… pnpm base:migrer --simuler` pour voir ce qui sera appliqué, puis `pnpm base:migrer`. La commande applique les migrations qui manquent, dans l'ordre et chacune dans sa transaction, et note en base celles déjà passées. Elle refuse une migration déjà appliquée dont le fichier a changé. Les migrations ne s'appliquent qu'en avant : une erreur se corrige par une nouvelle migration (§6). Une base migrée à la main avant cet outil : vérifier la dernière migration appliquée, puis `pnpm base:migrer --marquer-jusqu-a <nom du fichier>`.
6. **Pack pays** : `cd application && pnpm pack:sql ../referentiels/gabon > import.sql`, puis appliquer `import.sql`. Le pack fictif `zz-fictif` est **refusé** sans `--test` : ne jamais l'importer en production.
7. **Compte du propriétaire** : se connecter une fois sur le site (le compte d'authentification est créé), puis, avec la connexion d'administration :
   `insert into profils (id, role, prenom_ou_pseudo) values ('<identifiant de votre compte>', 'administrateur', 'Propriétaire');`
   (identifiant visible dans la liste des utilisateurs de Supabase).
8. **Référents** : `/administration` → « Inviter un référent » (ADR 0066) : cocher les familles, choisir la durée, noter le code affiché **une seule fois**, le transmettre à l'enseignant par un canal sûr. Une invitation en attente peut être annulée depuis la même page. En secours, sans l'interface : `pnpm referent:invitation ga-general mathematiques 14 > invitation.sql`, puis appliquer le fichier.
9. **Classes du pilote** (après l'avis du juriste, Q19 ; ADR 0063, 0067) : `/administration` → « Classes du pilote ». Choisir le niveau (et la série s'il y a lieu), le nom et l'établissement. Deux codes s'affichent **une seule fois** : le code personnel de l'enseignant (14 jours par défaut, usage unique) et le code de classe pour ses élèves (120 jours par défaut). Les transmettre à l'enseignant par un canal sûr. Depuis la même page : nouveau code de classe (l'ancien cesse de marcher, les élèves déjà rattachés le restent), nouvelle invitation d'enseignant, annulation d'une invitation en attente. En secours : `pnpm classe:creer ga-general 3e "3e A" "<établissement>" > classe.sql`, puis appliquer le fichier.

## 3. Application

0. **Construire et installer** (ADR 0076). Deux voies :
   - **serveur Linux** : `cd application && pnpm paquet` produit `../paquet/`. Il contient le serveur autonome, les prompts et skills des agents, le pack pilote et les règles communes, **sans aucun secret, fichier de test ni pack fictif**, avec sa version (commit). Le copier sur le serveur, puis suivre `paquet/LISEZ-MOI.md` : un service systemd par processus (`deploiement/plateforme@.service`, deux instances) et un répartiteur https (`deploiement/Caddyfile.exemple`, qui pose aussi HSTS) ;
   - **hébergement sans serveur** : l'hébergeur construit depuis le dépôt. `agents/`, `referentiels/` et `docs/prompt-claude-code.md` doivent rester lisibles par le serveur (`CHEMIN_DEPOT`).

1. **Variables d'environnement** sur l'hébergeur (jamais dans le dépôt). Le modèle est dans `secrets/commun.env.example`, avec en plus `ANTHROPIC_API_KEY`.
2. **Vérification** avant chaque mise en service : `pnpm verifier:production` sur le serveur. La commande liste ce qui manque **sans jamais afficher une valeur**, et doit se terminer par « Configuration complète ». Elle refuse :
   - une API de données de Supabase ouverte (§2.2) ;
   - un `SEL_OPPOSITION` absent : le fixer **une fois pour toutes**, car le changer ferait oublier les oppositions ;
   - la simulation ;
   - une adresse non https ;
   - un secret recopié du modèle ;
   - un fournisseur de messages absent ;
   - une vidéo simulée ;
   - une vidéo réelle (`MODE_VIDEO=reel`) sans passerelle d'avatar en https, sans tarif, sans compte ou jeton Stream, sans sous-domaine de lecture.
3. **Sécurité déjà en place** :
   - la simulation n'existe que sur un poste local ;
   - cookies `Secure` ;
   - sessions révocables, plus courtes pour les référents (7 jours) et l'administration (12 heures) ;
   - en-têtes de sécurité, politique de contenu à nonce ;
   - limites de connexion et quotas en base ;
   - journaux sans contenu ni identifiant (ADR 0043), toute la console du serveur nettoyée, erreurs de requête suivies (ADR 0056).
3 bis. **Vérification du site en ligne** (ADR 0073), après chaque déploiement, depuis n'importe quel poste : `pnpm verifier:site https://<adresse>`. Elle est en lecture seule : aucune session, rien n'est créé ni modifié. Elle contrôle :
   - https ;
   - les en-têtes de sécurité et la politique de contenu à nonce (nonce différent à chaque page, pas de `unsafe-eval`) ;
   - la santé, jamais mise en cache ;
   - la page de connexion ;
   - la **simulation fermée** ;
   - les espaces réservés, qui renvoient vers la connexion ;
   - les API sensibles, qui refusent sans session ni jeton ;
   - les cookies protégés ;
   - le service worker.

   Elle doit finir par « Site conforme ». HSTS n'est qu'un avertissement, car l'hébergeur le pose souvent lui-même.
4. **Surveillance** : `GET /api/sante` répond 200 si l'application et la base répondent, 503 sinon. Il ne donne ni détail ni donnée. À brancher sur une surveillance de disponibilité (alerte au propriétaire). Pour recevoir les erreurs ailleurs que dans les journaux de l'hébergeur : `JOURNAL_HTTP_URL` (https) et `JOURNAL_HTTP_JETON` (ADR 0056).
5. **Tenue en charge** (ADR 0059, 0064) : un processus du serveur tient 200 élèves simultanés au rythme d'une classe (95e centile 67 ms ; environ 115 pages dynamiques par seconde à saturation, sans erreur). Le goulot est le processeur du serveur web, pas la base. Donc :
   - sur un serveur à plusieurs cœurs, lancer **plusieurs processus** derrière le répartiteur de charge (mesuré : 2 processus sur 4 cœurs ≈ 165 pages par seconde) ; avec un hébergement sans serveur, l'hébergeur multiplie les instances lui-même ;
   - prévoir **plusieurs instances** dès que le pilote dépasse quelques classes ;
   - garder `TAILLE_POOL_BASE` à 10 par instance (connexions à la base), avec instances × 10 sous la limite de connexions de Supabase, en passant par son regroupeur de connexions ;
   - relancer la mesure avant le pilote, **sur une base locale de données fictives seulement** (le script refuse toute autre base) : `bash scripts/base-locale.sh reinitialiser`, `pnpm build`, serveur lancé en simulation sur le port 3100, puis `pnpm charge` (options `--eleves`, `--parcours`, `--pause` en ms, `--seuil-p95`, `--seuil-erreurs` ; `URL_CHARGE` peut lister plusieurs adresses séparées par des virgules, une par processus). Seuils : 95e centile ≤ 2 s, erreurs ≤ 1 %.

## 3 bis. Vidéo réelle (quand les fournisseurs sont choisis)

1. **Cloudflare Stream** :
   - créer un jeton d'API limité à « Stream : modifier » sur le compte ;
   - renseigner `CLOUDFLARE_COMPTE`, `CLOUDFLARE_JETON_STREAM` et `STREAM_SOUS_DOMAINE` (sous-domaine de lecture `customer-<code>.cloudflarestream.com`, visible dans le tableau de bord Stream).
   - Les vidéos sont lisibles sans adresse signée : ce sont des cours publiés, sans donnée d'élève.
2. **Fournisseur d'avatar** : avatar et voix **de synthèse** du catalogue, jamais une personne réelle sans autorisation enregistrée. La plateforme lui parle par une **passerelle HTTPS** (`AVATAR_HTTP_URL`, jeton `AVATAR_HTTP_JETON`). Un petit service, chez le fournisseur ou écrit pour lui, doit offrir :

   | Requête | Corps | Réponse |
   |---|---|---|
   | `POST /videos` | `{texte, avatar, voix, langue, indications}` | `{id}` |
   | `GET /videos/{id}` | — | `{statut: en_cours \| pret \| echec, url (https), duree_secondes, cout_usd}` |
   | `POST /transcriptions` | `{url_video, langue}` | `{texte, cout_usd}` |
   | `POST /assemblages` | `{videos: [url, …]}` | `{id}` |
   | `GET /assemblages/{id}` | — | `{statut, url, duree_secondes, cout_usd}` |

   `AVATAR_COUT_MINUTE_USD` : tarif annoncé, utilisé pour estimer chaque segment **avant** la dépense ; le budget par vidéo arrête la production dès qu'il serait dépassé.
3. `MODE_VIDEO=reel`, puis `pnpm verifier:production`.
4. Essai : un script de test validé, une vidéo produite « à relire », regardée en entier par le référent, avec la version « économie de données ». Le coût est noté dans le journal de production.

## 4. Tâches planifiées

| Tâche | Fréquence | Commande |
|---|---|---|
| Exécuteur : alerte de veille et relances, file des agents, décrochage, rapports hebdomadaires | **Toutes les 5 minutes** (pilote, condition 8) | `POST /api/orchestrateur/executer` avec l'en-tête `Authorization: Bearer <JETON_EXECUTEUR>` |
| Purge selon les durées du pack (échanges, comptes ; signalements, tickets, recrutement et rapports dès que leurs durées sont fixées ; sessions closes) | Quotidienne, **seulement après validation des durées par le juriste** (D3) | Une semaine de `pnpm donnees:purger` (simulation, rien n'est effacé), relue ; puis `pnpm donnees:purger --confirmer` |
| Sauvegarde hors de l'hébergeur | Quotidienne | `pg_dump` chiffré, gardé 30 jours (§5) |

## 5. Sauvegardes et restauration

**Deux niveaux** (ADR 0072) :
1. les sauvegardes de l'hébergeur de la base (Supabase : quotidiennes, et restauration à un instant donné si le budget le permet). C'est la voie normale de restauration ;
2. une **copie de secours indépendante**, faite par la plateforme, pour ne pas dépendre d'un seul fournisseur.

**Faire la copie de secours** (quotidienne, depuis le serveur ou un poste du propriétaire) :

```
cd application
URL_BASE_DONNEES_ADMIN=… pnpm base:sauvegarder /chemin/des/sauvegardes
```

Elle crée un dossier `sauvegarde-<date>` contenant :
- la copie complète ;
- les rôles, **sans aucun mot de passe** ;
- le nombre de lignes de chaque table ;
- les empreintes des fichiers.

La copie contient des **données d'élèves**. Il faut donc :
- la chiffrer, ou la garder sur un disque chiffré ;
- la garder hors du dépôt (`sauvegardes/` et `*.dump` sont ignorés par git) ;
- en limiter l'accès au propriétaire ;
- la garder 30 jours au plus.

**Restaurer** dans une base **vide** (serveur de secours ou base d'essai). La commande refuse une base qui contient déjà des tables, une sauvegarde dont les empreintes ne correspondent plus, et toute exécution sans `--confirmer` :

```
URL_BASE_DONNEES_CIBLE=… pnpm base:restaurer /chemin/des/sauvegardes/sauvegarde-<date> --confirmer
```

Elle recrée les rôles et restaure. Elle vérifie ensuite que chaque table a le même nombre de lignes qu'au moment de la sauvegarde. Il reste ensuite à :
- redonner un mot de passe au rôle `serveur_application` ;
- pointer `URL_BASE_DONNEES` vers la base restaurée ;
- lancer `pnpm verifier:production`.

Sur Supabase, préférer la restauration du fournisseur : la copie de secours sert si le fournisseur est indisponible, ou pour une vérification indépendante.

**Essai de restauration**, avant le pilote puis chaque mois :
1. restaurer la dernière copie dans une base jetable ;
2. ouvrir le site d'essai sur cette base, se connecter, compter les unités, les chapitres et les élèves ;
3. supprimer la base jetable ;
4. noter la date, la durée et le résultat ci-dessous.

L'essai automatique `pnpm test:sauvegarde`, lancé à chaque changement de code, fait la même chose sur des données fictives :
- deux Postgres locaux, sauvegarde puis restauration dans un serveur vide ;
- vérification des nombres de lignes, des règles d'accès, des droits des agents et des rôles ;
- refus d'une base non vide et d'une sauvegarde altérée.

| Date | Sauvegarde restaurée | Durée | Résultat | Par |
|---|---|---|---|---|
| 2026-10-28 | Données fictives (essai automatique) | < 1 min | Réussi | Claude Code |

**Objectifs proposés** : perte de données de 24 heures au plus, service rétabli en 4 heures au plus. À confirmer selon le budget.

## 6. Déploiement d'une nouvelle version

1. Tous les contrôles verts sur la branche :
   - `pnpm lint`, `pnpm format:verifier`, `pnpm typecheck` ;
   - `pnpm test`, `pnpm test:base`, `pnpm test:migrations`, `pnpm test:sauvegarde`, `pnpm test:e2e` ;
   - et les batteries réelles des agents dont le prompt ou les skills ont changé.
2. Relecture du changement et accord du propriétaire.
3. Sauvegarde juste avant (`pnpm base:sauvegarder`, §5).
4. **Migrations d'abord** (`pnpm base:migrer --simuler`, puis `pnpm base:migrer`), seulement si elles sont compatibles avec la version en service : ajout de tables ou de colonnes, nouvelles fonctions. Sinon, couper l'accès des élèves pendant la mise à jour (interrupteur de `/administration`). Une migration en échec est annulée entièrement : corriger, puis relancer.
5. Déploiement de l'application, puis `pnpm verifier:production` sur le serveur et `pnpm verifier:site https://<adresse>` depuis un autre poste.
6. Vérifications à la main :
   - `/api/sante` ;
   - connexion avec un numéro de l'équipe ;
   - un chapitre ;
   - une question au professeur ;
   - `/administration` (agents actifs, file humaine).

## 7. Retour arrière

| Problème | Action |
|---|---|
| Version de l'application défectueuse | Remettre la version précédente chez l'hébergeur (retour immédiat) ; les migrations compatibles restent en place |
| Migration défectueuse | Nouvelle migration corrective (jamais de modification d'une migration appliquée) ; en dernier recours, restauration de la sauvegarde faite juste avant (§5) |
| Agent qui se comporte mal ou coûte trop | Suspension de l'agent (automatique au plafond de coût, ou par `/administration`) |
| Incident grave (fuite, contenu dangereux) | Couper l'accès des élèves (interrupteur, message neutre), puis suivre le §8 |

## 8. Incident de sécurité ou de données

1. Couper l'accès des élèves si nécessaire ; suspendre les agents concernés.
2. Fermer toutes les sessions depuis `/administration` (« Déconnecter toutes les sessions »), puis changer les secrets touchés :
   - `SECRET_SESSION` (déconnecte aussi tout le monde) ;
   - `JETON_EXECUTEUR` ;
   - les clés des fournisseurs ;
   - la clé de l'API Claude ;
   - le mot de passe de `serveur_application`.
3. Garder les traces (journal d'audit pseudonymisé, journaux de l'hébergeur), sans les copier hors du système.
4. Prévenir le juriste : une notification à l'autorité de protection des données, et aux familles, peut être obligatoire.
5. Écrire le retour d'expérience et la correction, avec un test qui empêche le retour du problème.

## 9. Avant la mise en service : liste à cocher

- [ ] Décisions du §1 prises ; budget approuvé.
- [ ] API de données de Supabase fermée (§2.2).
- [ ] Migrations et pack Gabon appliqués ; compte du propriétaire créé ; référent invité.
- [ ] `pnpm verifier:production` : « Configuration complète ».
- [ ] SMS et email réels essayés sur un numéro et une adresse de l'équipe (pilote, condition 7).
- [ ] Exécuteur planifié toutes les 5 minutes ; alerte de veille reçue sur un vrai téléphone (condition 8).
- [ ] Surveillance de `/api/sante` branchée.
- [ ] Sauvegarde quotidienne et premier test de restauration faits (condition 6).
- [ ] Suspension d'un agent et interrupteur d'accès essayés sur le site déployé (condition 12).
- [ ] Purge : durées validées par le juriste avant d'activer `--confirmer`.
