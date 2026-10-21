# Dossier de mise en production

**Statut** : rédigé par Claude Code (Jalon 5, étape 2 ; ADR 0045). **Rien n'est déployé ni souscrit** : chaque étape se fait par le propriétaire, ou avec son accord explicite.

Ce dossier dit **comment** mettre la plateforme en service. Le pilote reste soumis aux 12 conditions de [`docs/pilote/README.md`](../pilote/README.md) (juriste, établissement, référent, contenus validés, essais réels, veille). Ce dossier couvre surtout les conditions 6, 7, 8 et 12.

## 1. Décisions préalables (propriétaire)

| Décision | Proposition | Référence |
|---|---|---|
| Hébergement de l'application | Vercel Pro (le plus simple) ou Cloudflare Workers (gratuit au départ, à essayer : la connexion Postgres directe y demande un relais) | `docs/fournisseurs-2026-10.md` §5 |
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
5. **Migrations** : appliquer `application/supabase/migrations/*.sql` dans l'ordre des noms, avec la connexion d'administration. Elles ne s'appliquent qu'en avant : une erreur se corrige par une nouvelle migration (§6).
6. **Pack pays** : `cd application && pnpm pack:sql ../referentiels/gabon > import.sql`, puis appliquer `import.sql`. Le pack fictif `zz-fictif` est **refusé** sans `--test` : ne jamais l'importer en production.
7. **Compte du propriétaire** : se connecter une fois sur le site (le compte d'authentification est créé), puis, avec la connexion d'administration :
   `insert into profils (id, role, prenom_ou_pseudo) values ('<identifiant de votre compte>', 'administrateur', 'Propriétaire');`
   (identifiant visible dans la liste des utilisateurs de Supabase).
8. **Référents** : `pnpm referent:invitation ga-general mathematiques 14 > invitation.sql`, appliquer le fichier, transmettre le code à l'enseignant par un canal sûr.

## 3. Application

1. **Variables d'environnement** sur l'hébergeur (jamais dans le dépôt). Le modèle est dans `secrets/commun.env.example`, avec en plus `ANTHROPIC_API_KEY`.
2. **Vérification** avant chaque mise en service : `pnpm verifier:production` sur le serveur. La commande liste ce qui manque **sans jamais afficher une valeur**, et doit se terminer par « Configuration complète ». Elle refuse :
   - une API de données de Supabase ouverte (§2.2) ;
   - un `SEL_OPPOSITION` absent : le fixer **une fois pour toutes**, car le changer ferait oublier les oppositions ;
   - la simulation ;
   - une adresse non https ;
   - un secret recopié du modèle ;
   - un fournisseur de messages absent ;
   - une vidéo simulée.
3. **Sécurité déjà en place** :
   - la simulation n'existe que sur un poste local ;
   - cookies `Secure` ;
   - sessions révocables, plus courtes pour les référents (7 jours) et l'administration (12 heures) ;
   - en-têtes de sécurité, politique de contenu à nonce ;
   - limites de connexion et quotas en base ;
   - journaux sans contenu ni identifiant (ADR 0043).
4. **Surveillance** : `GET /api/sante` répond 200 si l'application et la base répondent, 503 sinon. Il ne donne ni détail ni donnée. À brancher sur une surveillance de disponibilité (alerte au propriétaire).

## 4. Tâches planifiées

| Tâche | Fréquence | Commande |
|---|---|---|
| Exécuteur : alerte de veille et relances, file des agents, décrochage, rapports hebdomadaires | **Toutes les 5 minutes** (pilote, condition 8) | `POST /api/orchestrateur/executer` avec l'en-tête `Authorization: Bearer <JETON_EXECUTEUR>` |
| Purge selon les durées du pack (échanges, comptes ; signalements, tickets, recrutement et rapports dès que leurs durées sont fixées ; sessions closes) | Quotidienne, **seulement après validation des durées par le juriste** (D3) | Une semaine de `pnpm donnees:purger` (simulation, rien n'est effacé), relue ; puis `pnpm donnees:purger --confirmer` |
| Sauvegarde hors de l'hébergeur | Quotidienne | `pg_dump` chiffré, gardé 30 jours (§5) |

## 5. Sauvegardes et restauration

- **Sauvegardes** : celles de Supabase (quotidiennes), plus un `pg_dump --format=custom` quotidien. Ce dernier est chiffré et gardé hors du fournisseur, 30 jours au plus : ce sont des données d'élèves, donc l'accès en est limité au propriétaire.
- **Test de restauration**, avant le pilote puis chaque mois :
  1. restaurer la dernière sauvegarde dans une base jetable ;
  2. vérifier la connexion, le nombre d'unités, de chapitres et d'élèves ;
  3. supprimer la base jetable ;
  4. noter la date et la durée dans ce dossier.
- **Objectifs proposés** : perte de données de 24 heures au plus, service rétabli en 4 heures au plus. À confirmer selon le budget.

## 6. Déploiement d'une nouvelle version

1. Tous les contrôles verts sur la branche :
   - `pnpm lint`, `pnpm format:verifier`, `pnpm typecheck` ;
   - `pnpm test`, `pnpm test:base`, `pnpm test:e2e` ;
   - et les batteries réelles des agents dont le prompt ou les skills ont changé.
2. Relecture du changement et accord du propriétaire.
3. Sauvegarde manuelle de la base juste avant.
4. **Migrations d'abord**, seulement si elles sont compatibles avec la version en service : ajout de tables ou de colonnes, nouvelles fonctions. Sinon, couper l'accès des élèves pendant la mise à jour (interrupteur de `/administration`).
5. Déploiement de l'application, puis `pnpm verifier:production`.
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
