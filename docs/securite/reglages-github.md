# Réglages de sécurité GitHub — à faire par le propriétaire

**Pour** : le propriétaire du dépôt `Poppy540/Plateforme-ENSEIGNEMENT`, seul à avoir les droits d'administration. **Durée** : environ 15 minutes. **Vérification** : `cd application && pnpm verifier:depot` (lecture seule) indique ce qui reste. **Décision** : ADR 0107.

Les libellés des menus de GitHub sont en anglais ; ils sont cités tels quels, entre guillemets. GitHub renomme parfois ses menus : en cas de doute, chercher le libellé dans la barre de recherche des réglages.

## État au 2026-11-03 (relevé par `pnpm verifier:depot`)

| Réglage                                    | État                                                             |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Analyse des secrets (« Secret scanning »)  | ✓ activée                                                        |
| Protection à l'envoi (« Push protection ») | ✓ activée                                                        |
| Mises à jour de sécurité Dependabot        | ✗ à activer (étape 1)                                            |
| Signalement privé des failles              | ✗ à activer (étape 1)                                            |
| Branche `main` protégée                    | ✗ à faire (étape 2)                                              |
| SECURITY.md, Dependabot, CodeQL sur `main` | ! arrivent avec la fusion de la branche de travail (étape 5)     |
| Adresse email privée                       | ! 4 commits récents sur 8 portent une adresse publique (étape 4) |

## Étape 1 — Sécurité du code (5 minutes)

Dépôt → **« Settings »** → **« Advanced Security »** (selon les comptes : « Code security » ou « Code security and analysis ») :

1. **« Private vulnerability reporting »** → **« Enable »**. C'est le canal que décrit `SECURITY.md` : quelqu'un qui trouve une faille vous l'écrit en privé.
2. **« Dependabot alerts »** → **« Enable »** : vous êtes prévenu quand une dépendance a une faille connue.
3. **« Dependabot security updates »** → **« Enable »** : Dependabot propose lui-même la correction, sous forme de demande de fusion, que le contrôle complet vérifie.
4. Laisser activés **« Secret scanning »** et **« Push protection »** : c'est déjà fait.

## Étape 2 — Protéger la branche principale (5 minutes)

**« Settings »** → **« Rules »** → **« Rulesets »** → **« New ruleset »** → **« New branch ruleset »** :

1. **« Ruleset name »** : `main protégée`. **« Enforcement status »** : « Active ».
2. **« Target branches »** → **« Add target »** → **« Include default branch »**.
3. Cocher :
   - **« Restrict deletions »** : la branche ne peut pas être effacée ;
   - **« Block force pushes »** : l'historique ne peut pas être réécrit ;
   - **« Require a pull request before merging »**, avec « Required approvals » à **0**. Vous êtes seul responsable : GitHub ne laisse pas l'auteur approuver sa propre demande. Mettre 1 le jour où un second responsable existe ;
   - **« Require status checks to pass »** → ajouter **« verifications »** : le contrôle complet du flux « Application » doit être vert avant la fusion.
4. **« Create »**.

## Étape 3 — GitHub Actions (2 minutes)

**« Settings »** → **« Actions »** → **« General »** :

1. **« Fork pull request workflows from outside collaborators »** → **« Require approval for all external contributors »** : un inconnu ne fait rien tourner sur votre compte sans votre accord.
2. **« Workflow permissions »** → **« Read repository contents and packages permissions »**. Les flux déclarent déjà ce dont ils ont besoin, et un test le vérifie.
3. Décocher **« Allow GitHub Actions to create and approve pull requests »**.

**« Settings »** → **« Collaborators »** : vérifier que vous seul avez le droit d'écriture. Ce droit permettrait de lancer les essais payants des agents le jour où la clé sera dans les secrets du dépôt.

## Étape 4 — Votre adresse email (1 minute)

Ce réglage est sur votre compte, pas sur le dépôt : **github.com** → votre photo → **« Settings »** → **« Emails »** :

1. **« Keep my email addresses private »** : les prochains commits faits depuis GitHub utiliseront une adresse masquée.
2. **« Block command line pushes that expose my email »**.

Les commits déjà publiés gardent leur adresse : on ne réécrit pas l'historique d'un dépôt public.

## Étape 5 — Fusionner la branche de travail dans `main`

`SECURITY.md`, la configuration de Dependabot et l'analyse CodeQL sont sur la branche de travail `claude/gabon-education-platform-ldrr4p`. GitHub ne les prend en compte qu'une fois sur `main`. La fusion passe par une demande de fusion (« pull request »), que Claude Code peut préparer **si vous le lui demandez**, et que vous fusionnez après le contrôle vert.

## Vérifier

```
cd application
pnpm verifier:depot
```

Le résultat attendu est « Dépôt conforme ». Restent toujours à vérifier à la main, car invisibles sans droits d'administration : les alertes Dependabot, l'approbation des contributeurs externes et la liste des collaborateurs.
