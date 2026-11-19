# 0101 — Lecture sans réseau étendue (décision D14)

- **Date** : 2026-11-02 · **Statut** : accepté (Jalon 18, étape 4 ; D14 b choisie par le propriétaire) · **Complète** l'ADR 0044

## Contexte

Jusqu'ici, seuls les chapitres déjà ouverts se relisaient sans réseau (ADR 0044). Un élève coupé du réseau ne retrouvait ni ses cours, ni son plan de révision, ni la correction de ses quiz. Ce qui reste sur un téléphone souvent partagé, appartenant à un mineur, est une décision du propriétaire.

Trois choix étaient présentés :

- a : navigation seulement ;
- **b : navigation, plan de révision et corrections de quiz, avec une durée limite** (recommandé) ;
- c : rien de plus.

## Décision (D14 b)

- **Pages gardées** par le service worker (`public/sw.js`), en lecture seule, réseau d'abord et copie ensuite :
  - les chapitres, comme avant ;
  - « Mes cours » (`/catalogue`) ;
  - les chapitres d'une matière ;
  - le plan de révision ;
  - la **correction d'un quiz déjà fait**.
- **Un quiz à faire n'est jamais gardé** : la page de quiz ne porte la marque `<meta name="garder-hors-ligne">` que lorsqu'elle affiche la correction. Sans cette marque, la page n'est pas copiée, et une ancienne copie est effacée.
- **Durée limite de 7 jours** : une copie plus ancienne n'est plus servie. Elle est effacée à la première occasion : activation du service worker, liste des pages gardées, tentative de lecture.
- **Règles inchangées** : une copie par personne, rangée sous un pseudonyme salé, effacée à la déconnexion et au changement de personne.
- **Date visible** : une page lue hors ligne affiche « Tu es hors connexion : tu lis la copie enregistrée le … ». La date est transmise par un attribut posé par le service worker ; le contenu de la page n'est pas modifié.
- **Information** : la fiche d'information des familles le dit, avec le conseil de se déconnecter sur un téléphone partagé. Le dossier du juriste le décrit (§6, risque R11, question Q20).

## Conséquences

- Tests de bout en bout (`hors-ligne-etendu.spec.ts`) :
  - pages relues sans réseau, avec la date de la copie ;
  - quiz à faire jamais gardé ;
  - copie de plus de 7 jours ni servie ni gardée.

  Les tests de l'ADR 0044 (déconnexion, changement de personne) couvrent les nouvelles pages, qui sont rangées au même endroit.

- La durée de 7 jours est à confirmer par le juriste (Q20).
