# 0099 — Budgets de poids et de temps de toutes les pages

- **Date** : 2026-10-30 · **Statut** : accepté (Jalon 18, étape 2) · **Complète** l'ADR 0044 (budget de 200 Ko sur 5 pages publiques)

## Contexte

Les mesures de l'étape 1 (`docs/performance/mesures-jalon-18.md`) donnent :

- 146 à 158 Ko au premier chargement pour les 41 pages mesurées ;
- 0 à 13 Ko pour une page rouverte ;
- un affichage en 1,4 s et une page utilisable en 6,3 s en 2G.

Seules cinq pages publiques avaient un budget (200 Ko), mesuré avec une méthode qui comptait aussi le cache.

## Décision

- **Un budget par public**, tiré des mesures avec environ 10 % de marge (`BUDGETS`, `src/lib/exploitation/faible-debit.ts`) :

  | Public                               | Premier chargement | Page rouverte | Affichage en 2G | Utilisable en 2G |
  | ------------------------------------ | ------------------ | ------------- | --------------- | ---------------- |
  | Visiteur, élève, parent              | 160 Ko             | 20 Ko         | 2 s             | 7,5 s            |
  | Enseignant, référent, administration | 175 Ko             | 30 Ko         | 2 s             | 7,5 s            |

- **Chaque page de l'application a un public** (`ROUTES`). Un test unitaire compare cette liste aux pages du dossier `src/app` : une page nouvelle sans public, donc sans budget, le fait échouer. Une page peut être déclarée non mesurée, mais seulement avec une raison écrite, par exemple « demande une fiche candidat ».
- **Vérifié à chaque contrôle** : `tests/bout-en-bout/poids-pages.spec.ts` remplace l'ancien test de poids.
  - Il ouvre toutes les pages par le parcours sur données fictives, partagé avec `pnpm mesurer:pages` (`tests/commun/pages-plateforme.ts`).
  - Il compare leur poids au premier chargement et rouvertes au budget de leur public.
  - Il chronomètre en 2G, processeur ralenti, la première page de chaque public : le temps dépend surtout du socle commun.
  - Il échoue si une page à mesurer n'a pas été ouverte.
  - Durée : environ 2,5 minutes de plus dans `pnpm controler`.
- **Octets comptés au réseau** : ce sont ceux que le navigateur reçoit réellement (protocole Chrome). Une ressource servie par le cache ou le service worker compte pour ce qu'elle coûte.
- **Ce qui disparaît** : l'ancien test de poids des 5 pages publiques (200 Ko) et de la page de connexion en 2G (moins de 20 s). Les nouveaux budgets sont plus stricts.

## Conséquences

- Une page qui grossit de plus de 10 % fait échouer `pnpm controler` et GitHub Actions.
- Relever un budget est une décision consignée : on modifie `BUDGETS` avec une raison, dans un ADR.
- Les données fictives du parcours utilisent un chapitre de 5e (« Fractions : opérations complètes ») que les autres tests n'utilisent pas.
