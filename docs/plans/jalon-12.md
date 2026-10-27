# Plan du Jalon 12 — prêt à déployer

**Statut** : validé par le propriétaire le 2026-10-28 (décisions ci-dessous, ADR 0074). **Rien n'est commencé.**

**Objectif** : que le premier déploiement soit une suite de gestes sûrs et vérifiés, pas une improvisation, et que la décision de démarrer le pilote repose sur un tableau objectif. **Rien n'est déployé ni souscrit dans ce jalon** : tout est préparé et essayé en local.

**Principe inchangé** : données fictives seulement ; aucune dépense sans l'accord du propriétaire ; aucun prompt d'agent modifié.

## Étapes (dans cet ordre)

| # | Étape | Contenu | Besoin du propriétaire |
|---|---|---|---|
| 0 | Plan | Ce plan, l'ADR 0074 et `memory.md`. | Validation (faite) |
| 1 | Migrations suivies | Commande `pnpm base:migrer` : elle applique les migrations qui manquent, dans l'ordre, chacune dans une transaction, et note dans la base celles déjà passées (nom et empreinte). Elle refuse une migration déjà passée dont le fichier a changé, et ne fait rien si tout est à jour. Option `--simuler` : liste ce qui serait appliqué. Elle remplace « appliquer les fichiers dans l'ordre à la main ». Essayée sur une base neuve, sur une base à jour, et sur une base en retard d'une migration ; tests automatisés. | — |
| 2 | Paquet de déploiement | Build autonome de Next.js (`output: "standalone"`), commande `pnpm paquet` qui produit un dossier prêt à copier sur un serveur (application, pack pays, prompts et skills des agents, scripts d'exploitation), sans aucun secret ni fichier de test. Exemples de configuration, sans valeur : un service pour un serveur Linux, avec deux processus (ADR 0064) et un redémarrage automatique, et des notes pour un hébergement sans serveur. | Choix de l'hébergeur plus tard (E1) |
| 3 | Répétition générale en local | Script qui enchaîne, sur une base locale « comme en production » (simulation coupée) : base neuve, `base:migrer`, import du pack, `verifier:production`, démarrage du paquet, `verifier:site --local`, puis sauvegarde et restauration. Rapport final. Ce qui ne peut pas passer en local (SMS, email, https) est listé à part. Ajouté au guide de mise en route (E2). | — |
| 4 | Tableau des 12 conditions du pilote | Page dans l'administration : les 12 conditions de `docs/pilote/README.md`, chacune avec son état. Il est **vérifié automatiquement** quand la base le permet : référent actif, chapitres du pilote prêts, classe créée, sauvegarde récente notée, accès des élèves, agents actifs, etc. Sinon, il est **coché par le propriétaire avec une preuve** (texte court et date), tracé dans le journal d'audit. Le décompte final sert à la décision de démarrer (G2). Tests de base et de bout en bout, accessibilité. | Cocher les conditions au fil de l'eau |
| 5 | Passages réels des agents | Dès que la clé, la relecture des skills et l'accord sont là : mini-essais, puis séries complètes (~121 USD) après un nouvel accord. | Clé API ; accord sur chaque coût |
| 6 | Démonstration et bilan | Captures du tableau des conditions ; bilan comme aux jalons précédents. | — |

L'étape 5 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-10-28)

1. **Pistes retenues** : préparer le déploiement (migrations suivies, paquet, répétition générale en local) et le tableau des 12 conditions du pilote.
2. **Écartées pour ce jalon** : la skill « faible débit » et une nouvelle matière de 3e.

## Hors Jalon 12

- Le déploiement lui-même et toute souscription (après l'accord du propriétaire, étapes E1 et E2 du guide).
- Skill « faible débit », nouvelles matières, WhatsApp, paiements.
- Vue par élève pour l'enseignant (après l'avis du juriste).
