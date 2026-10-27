# 0070 — Accueil du référent et chapitres du pilote

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 11, étape 1).

## Contexte

Le référent est le goulot du pilote (ADR 0069). Son espace listait tout ce qui attend dans ses familles, sans dire par quoi commencer. Les 3 à 5 chapitres que la classe pilote verra en premier n'y étaient pas distingués. Rien ne lui expliquait non plus l'ordre du travail ni le temps à prévoir.

## Décision

1. **Chapitres du pilote** (table `chapitres_pilote`, migration 0038), désignés par le propriétaire sur `/administration/pilote` : choix d'une unité, puis cases à cocher, 10 chapitres au plus par unité. Fonctions réservées à l'administration et tracées : `unites_pour_pilote`, `chapitres_unite_pilote`, `definir_chapitres_pilote`. **Aucun chapitre n'est écrit dans le code.**
2. **En tête de l'espace référent** : les chapitres du pilote de ses familles (`etat_chapitres_pilote`, réservée aux référents), avec l'état de chaque contenu et la **prochaine action** :
   - valider le programme ;
   - décider les liens de prérequis ;
   - faire rédiger ou relire le script ;
   - faire créer ou relire le quiz ;
   - relire la vidéo (facultatif) ;
   - sinon « prêt pour les élèves ».

   Chaque action mène à la bonne page. Le texte indique aussi le nombre d'étapes faites sur 4. L'ordre est celui du guide du référent ; la règle est une fonction pure, testée (`src/lib/referent/prochaine-action.ts`).
3. **Accueil** (`/referent/accueil`) : le rôle du référent, par où commencer, les cinq étapes avec un temps indicatif, et ce qu'il faut garder en tête. Tant que le référent ne l'a pas fermé, un encadré « Bienvenue » en tête de son espace y renvoie (`profils.accueil_vu_le`, `marquer_accueil_vu`). Ensuite, un lien « Revoir l'accueil » reste.
   - Choix d'un **encadré** plutôt que d'une redirection obligatoire : le référent n'est jamais bloqué, et il arrive toujours sur son espace après l'activation.

## Conséquences

- Le propriétaire désigne les chapitres du pilote dès que le cadre du pilote est fixé (guide de mise en route, A4 et D2).
- Les temps indicatifs de l'accueil sont des estimations de Claude Code, à ajuster avec le premier référent.
- Tests : base CP01 à CP03 ; unitaires de la prochaine action ; bout en bout `chapitres-pilote.spec.ts` (choix par l'administration, encadré, accueil, prochaine action, audit d'accessibilité).
