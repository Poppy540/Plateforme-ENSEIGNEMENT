# 0059 — Tenue en charge : 200 élèves simultanés

- **Date** : 2026-10-23 · **Statut** : appliqué (Jalon 8, étape 3).

## Contexte

Le plan du Jalon 8 (ADR 0058) demande de vérifier ce qui ne l'avait jamais été : la tenue de la plateforme quand 200 élèves l'utilisent en même temps (une classe de pilote large, ou plusieurs classes). Jusqu'ici, les tests de bout en bout faisaient passer un élève à la fois. La taille du réservoir de connexions à la base était fixée dans le code (10).

## Décision

1. **Script** `application/scripts/tenue-en-charge.mts` (`pnpm charge`), en Node, sans nouvelle dépendance. Il prépare en base des élèves **fictifs** actifs : chapitres et quiz fictifs validés, une session ouverte par élève. Le cookie de chaque élève est signé comme le ferait le serveur. Chaque élève fait ensuite le parcours espace → catalogue → unité → chapitre (avec le compteur de lecture) → question au Professeur → quiz, plusieurs fois, avec une pause aléatoire entre deux pages. Le script mesure, par page, la médiane, le 95e centile, le maximum et les erreurs, puis les compare aux seuils. Le script **refuse toute base qui n'est pas locale** : il ne s'exécute que sur la base jetable de données fictives.
2. **Seuils retenus** pour 200 élèves : 95e centile ≤ 2 s, erreurs ≤ 1 %. Ils sont réglables (`--seuil-p95`, `--seuil-erreurs`).
3. **Réservoir de connexions réglable** : `TAILLE_POOL_BASE` vaut 10 par défaut (de 1 à 100). S'y ajoute un délai d'attente d'une connexion libre de 10 s : une requête qui ne trouve pas de connexion échoue franchement au lieu de rester figée.

## Mesures (poste de développement à 4 cœurs, serveur de production Next.js, une instance, base locale, agents simulés)

| Scénario | Requêtes | Débit | Médiane | 95e centile | Erreurs |
|---|---|---|---|---|---|
| 200 élèves, une page toutes les ~5 s chacun (déjà intense pour une classe) | 2 800 | 37 / s | 25 ms | 59 ms | 0 |
| 200 élèves, une page toutes les ~1 s chacun | 4 200 | 100 / s | 0,98 s | 1,8 s | 0 |
| 200 élèves sans aucune pause (saturation) | 1 400 | 95 / s | 2,2 s | 3,1 s | 0 |

- **Goulot** : le processeur du serveur web (le processus Next.js est à un cœur plein, Postgres reste peu chargé). Une instance rend environ **100 pages dynamiques par seconde**. Le réservoir de connexions n'est pas le goulot : 5, 10 ou 20 connexions donnent le même débit.
- **Aucune erreur**, même à saturation : les quotas, les verrous par élève et les sessions tiennent.
- Page la plus lourde : le chapitre (leçon écrite, vidéo, prérequis), suivie de l'espace élève.
- La question au Professeur **ne garde aucune connexion** à la base pendant l'appel au modèle (préparation et enregistrement en deux transactions courtes) : un modèle réel, plus lent, n'épuise pas le réservoir.

## Conséquences

- En production, **plusieurs instances** de l'application (hébergement sans serveur ou plusieurs processus). Le nombre total de connexions doit rester sous la limite de la base : instances × `TAILLE_POOL_BASE` < limite. Chez Supabase, passer par le **regroupeur de connexions** (mode transaction) et garder 10 par instance.
- **Non mesuré ici** :
  - le vrai modèle. Sa latence et les limites de débit du compte Anthropic seront vues aux passages réels (étape 5). Le quota `QUESTIONS_PAR_JOUR` (40) borne la dépense par élève ;
  - le réseau des élèves (débit faible, déjà traité par la PWA et la vidéo adaptative) ;
  - la vraie connexion par SMS, dont le débit dépend du fournisseur.
- À relancer après chaque changement important et avant le pilote, sur une copie de la base de pré-production remplie de données fictives : `pnpm charge` (voir le dossier de production, §3).
