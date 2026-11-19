# Plan du Jalon 7 — élèves d'abord, vidéo prête à brancher, Français 3e

**Statut** : validé par le propriétaire le 2026-10-21 (décisions ci-dessous, ADR 0053). Étape 1 faite (accessibilité, ADR 0054). Étape 2 faite (vidéo prête à brancher, ADR 0055). Étape 3 faite (journal sans donnée personnelle, ADR 0056). Étape 4 faite (Français 3e, provisoire, ADR 0057). Étape 6 faite (captures `docs/demo/jalon-7/`, bilan `docs/bilans/jalon-7.md`). Étape 5 en attente de la clé API.

**Objectif** : le pilote attend surtout des décisions et des personnes : juriste, référents, fournisseurs, clé API. En attendant, ce jalon :
- renforce ce que les élèves vivront vraiment (accessibilité, téléphones modestes) ;
- réduit le travail du jour où les fournisseurs seront choisis (vidéo, journal d'erreurs) ;
- ajoute une première matière littéraire.

**Principe inchangé** : tout est construit en simulation, avec des données fictives. Rien n'est déployé ni souscrit, et aucune dépense n'est faite sans l'accord du propriétaire.

## Étapes (dans cet ordre)

| # | Étape | Contenu | Besoin du propriétaire |
|---|---|---|---|
| 0 | Plan | Ce plan, l'ADR 0053 et `memory.md`. | Validation (faite) |
| 1 | Accessibilité et téléphones modestes | Audit automatique WCAG 2.1 AA de toutes les pages (élève, parent, référent, administration) avec `@axe-core/playwright`, dépendance de test seulement, version épinglée. Corrections : contrastes, libellés, titres, navigation au clavier, zones à toucher, texte agrandi. Tests ajoutés pour qu'aucune régression ne passe. | Aucun (dépendance acceptée) |
| 2 | Vidéo prête à brancher | Adaptateur Cloudflare Stream (stack validée, ADR 0011) : dépôt, versions faible débit, lecture et sous-titres. Adaptateur générique de fournisseur d'avatar (HTTPS + jeton), qui garde les garde-fous de la production vidéo (script validé, empreinte, budget, aucune personne réelle). Tests de contrat sans réseau ; `verifier:production` étendu. Rien n'est souscrit. | Choix du fournisseur d'avatar (plus tard) |
| 3 | Journal d'erreurs sans donnée personnelle | Journal structuré côté serveur. Nettoyage automatique des numéros, emails, jetons, identifiants et textes d'élèves. Envoi possible vers un service de surveillance, par une variable ; tests. Couvre la condition 6 du pilote. | Choix du service (plus tard) |
| 4 | Français 3e | Programme provisoire repris du cadrage (`SOURCES.md` : à valider). Graphe de prérequis dans la famille. Valeurs des agents, avec la méthode et les garde-fous de la famille Français : ne jamais rédiger à la place de l'élève. Coordinateur de la famille Français. Vérification des réponses ouvertes de l'Évaluateur en simulation. | Référent de Français ; programmes IPN |
| 5 | Passages réels des agents | Dès que la clé et l'accord sont là : mini-essais, puis batteries complètes (~105 USD) après un nouvel accord. | Clé API ; accord sur chaque coût |
| 6 | Tests, démonstration, bilan | Comme aux jalons précédents. | — |

L'étape 5 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-10-21)

1. **Ordre** : les élèves d'abord (accessibilité), puis la vidéo prête à brancher, le journal d'erreurs, les contenus.
2. **Contenus** : Français 3e.
3. **Fournisseurs à préparer** : vidéo seulement (Cloudflare Stream et un adaptateur d'avatar générique). Pas de WhatsApp.
4. **Dépendance de test** : `@axe-core/playwright` acceptée (tests seulement).

## Hors Jalon 7

- WhatsApp.
- Paiements (pilote gratuit, ADR 0013).
- Mise en production.
- Pilote réel.
- Vrai second pays.
- Sciences de 6e à 4e.
