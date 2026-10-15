# Packs pays

Tout ce qui dépend d'un système éducatif vit ici, **jamais dans le code** : cycles, classes, séries, examens, programmes, coefficients, langue, calendrier, contexte local, paiement, cadre légal, équipe locale.

Le code ne connaît que des notions neutres (pays, référentiel, niveau, série, matière, unité, chapitre). Il ne contient aucune série, aucun nom de classe et aucun décompte d'unités propre à un pays.

## Structure d'un pack

```
referentiels/<code-pays>/
  pays.yaml               fiche pays : langue, monnaie, fuseau, statut du pack, référentiel, paiement, cadre légal
  structure.yaml          cycles, niveaux, séries, examens (avec code interne neutre)
  matieres.yaml           matières, famille, couche (universel / adaptable / local)
  familles.yaml           configuration partagée par famille de matières
  profils-niveau.yaml     adaptation du langage et des formats par niveau
  unites.yaml             unités (niveau, séries, matière)
  programmes/<unite>.yaml chapitres, sous-thèmes, volumes, coefficients, prérequis, statut de validation
  prerequis/<famille>.yaml     graphe de prérequis proposé (chapitre ← prérequis, strict/souple), validé lien par lien
  contexte-local.yaml     exemples et repères locaux
  agents/<agent>/<unite>.yaml  valeurs injectées dans les prompts des agents
  SOURCES.md              origine et statut (validé / à valider / manquant) de chaque donnée
```

## Importer un pack dans la base

```
cd application
pnpm pack:sql ../referentiels/<pays> > import.sql   # contrôle le pack puis génère le SQL
psql "<connexion à la base>" -f import.sql          # base de développement ; production seulement avec accord
```

Le contrôle refuse un pack incohérent (niveau, série ou matière inconnus, doublons, séries manquantes) en listant toutes les erreurs. L'import est relançable sans doublon et **ne valide jamais rien** : les chapitres arrivent « à valider », et un chapitre validé dont le contenu change dans le pack repasse « à valider ».

## Ajouter un pays

1. Copier `referentiels/_modele/` vers `referentiels/<code-pays>/`.
2. Suivre le processus du cadrage (« Processus d'ajout d'un nouveau pays ») : sources officielles, équipe locale, structuration (premier jet par l'agent Conformité programme), analyse de réutilisation, validation.
3. Aucune modification de code n'est nécessaire.

Packs existants : `gabon/` (pilote, statut « en préparation »).
