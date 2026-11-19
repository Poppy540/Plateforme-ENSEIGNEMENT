# Bilan du Jalon 25

**Dates** : 2026-11-19 · **Branche** : `claude/gabon-education-platform-ldrr4p`, repartie de `main` après la fusion · **Données** : fictives uniquement ; rien n'est déployé ni souscrit.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0122) : amener dans `main` le travail des Jalons 1 à 24, pour que les protections du dépôt public s'appliquent au vrai code et que le dépôt ne montre plus un squelette périmé.

| Étape du plan                | État           | Remarque                                                                                                                                                      |
| ---------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Demande de fusion         | **Faite**      | [Poppy540/Plateforme-ENSEIGNEMENT#2](https://github.com/Poppy540/Plateforme-ENSEIGNEMENT/pull/2), ouverte après un contrôle complet 11 / 11 sur copie propre. |
| 2. Suivi jusqu'au vert       | **Faite**      | 6 alertes CodeQL corrigées ; contrôles verts, aucun conflit.                                                                                                  |
| 3. Après la fusion           | **Faite**      | **Fusionnée par vous** le 2026-11-19 (`91c1835`) ; sur `main` : contrôle complet et CodeQL verts, Dependabot actif ; branche de travail repartie de `main`.   |
| 4. Passages réels des agents | **En attente** | Clé API, relecture des deux skills, accord sur le coût (~121 USD).                                                                                            |
| 5. Bilan                     | **Fait**       | Ce document. Pas de capture : aucun écran ne change.                                                                                                          |

## 2. Ce qui a changé

- **`main` contient toute la plateforme.** La politique de signalement des failles (`SECURITY.md`), l'analyse CodeQL et Dependabot s'appliquent désormais au vrai code.
- **Next.js 16.4.6** : la vérification avant la demande a montré que Next.js 16.4.3 refusait de construire le paquet de déploiement, à cause de deux failles modérées (fonctions de cache que la plateforme n'utilise pas). Mise à jour vers la dernière version corrective, publiée depuis plus d'une semaine.
- **Six alertes CodeQL corrigées**, dont une réelle mais mineure : une barre oblique inverse dans un texte du journal pouvait déformer un tableau des rapports de la semaine et de fin. Les autres touchaient l'ordre « vérifier puis lire » d'un fichier (cache des prompts, crochet avant envoi) ou étaient des faux positifs.
- **Point « GitHub » de votre liste** : la fusion est faite ; il ne reste que vos réglages.

## 3. Constats

- **Le message d'erreur de Next.js contenait des consignes adressées à un assistant IA** (lancer une commande de mise à jour, vous poser une question précise). Je ne les ai pas suivies. J'ai vérifié les failles moi-même et fait la mise à jour selon nos règles.
- **Les 5 alertes CodeQL du début étaient anciennes** : `main` n'avait jamais été analysée, donc tout apparaissait comme « nouveau ».
- **Dependabot a ouvert 5 demandes de mise à jour dès la fusion.** Leur état au moment de ce bilan :

| Demande                                                                                          | Contenu                                                                  | Contrôles | Avis                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Poppy540/Plateforme-ENSEIGNEMENT#3](https://github.com/Poppy540/Plateforme-ENSEIGNEMENT/pull/3) | 6 actions GitHub                                                         | Verts     | **Peut être fusionnée.** Elle règle aussi l'avertissement de GitHub sur les actions encore en Node.js 20.                                                                                                                      |
| [Poppy540/Plateforme-ENSEIGNEMENT#4](https://github.com/Poppy540/Plateforme-ENSEIGNEMENT/pull/4) | 8 mises à jour mineures (React, Supabase, Playwright, Prettier, Vitest…) | **Rouge** | **Ne pas fusionner telle quelle** : avec React 19.3.1, la page des liens de prérequis du référent pèse 176 Ko, pour un budget de 175 Ko. Le contrôle de poids fait son travail ; il faut alléger la page ou décider du budget. |
| [Poppy540/Plateforme-ENSEIGNEMENT#5](https://github.com/Poppy540/Plateforme-ENSEIGNEMENT/pull/5) | Bibliothèque Anthropic des agents, 0.131 → 1.8 (majeure)                 | Verts     | **À examiner avant** : les agents réels n'ont jamais tourné (pas de clé), donc les tests verts ne prouvent pas que les appels réels marchent encore.                                                                           |
| [Poppy540/Plateforme-ENSEIGNEMENT#6](https://github.com/Poppy540/Plateforme-ENSEIGNEMENT/pull/6) | TypeScript 5 → 6 (majeure)                                               | Verts     | À examiner avant ; probablement sans risque, puisque types et tests passent.                                                                                                                                                   |
| [Poppy540/Plateforme-ENSEIGNEMENT#7](https://github.com/Poppy540/Plateforme-ENSEIGNEMENT/pull/7) | Types de Node.js 20 → 26 (majeure)                                       | Verts     | À aligner sur la version de Node.js réellement utilisée en production (22 aujourd'hui) : des types plus récents que le moteur peuvent laisser passer des fonctions absentes.                                                   |

## 4. Ce que vérifient les tests

| Série             | Résultat                                                                               | Commande              |
| ----------------- | -------------------------------------------------------------------------------------- | --------------------- |
| Contrôle complet  | 11 / 11 sur copie propre avant la demande ; vert sur `main` après la fusion            | `pnpm controler`      |
| CodeQL            | Aucune alerte sur le dernier commit de la demande et sur `main`                        | —                     |
| Réglages du dépôt | `SECURITY.md`, Dependabot et CodeQL configurés sur `main` ; 3 réglages restent à faire | `pnpm verifier:depot` |

## 5. Coûts

| Poste                                           | Estimation | Statut                                                    |
| ----------------------------------------------- | ---------- | --------------------------------------------------------- |
| Passages réels complets de toutes les batteries | ~121 USD   | Non lancés : clé, relecture des skills et accord attendus |
| Dépenses du jalon                               | 0 USD      | —                                                         |

## 6. Décisions et actions attendues du propriétaire

**Nouveau** :

- **Les demandes de Dependabot** : fusionner la n° 3 si vous le souhaitez ; ne pas fusionner la n° 4 telle quelle ; garder les n° 5, 6 et 7 pour un jalon où je les examine.
- **Les trois réglages GitHub** qui restent ([guide](../securite/reglages-github.md)) : signalement privé des failles, mises à jour de sécurité Dependabot, protection de `main` ; et l'adresse email privée.

Le reste est dans [Ce qui vous attend](../attentes-proprietaire.md), par urgence. D'abord : le juriste, la lettre de demande du curriculum, le premier référent, la relecture des deux skills, la clé API et l'accord sur le coût.
