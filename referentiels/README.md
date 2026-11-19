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
  programmes/<unite>.yaml chapitres, sous-thèmes, volumes, coefficients, prérequis, statut de validation ; facultatifs : objectifs et source par chapitre, compétences (curriculum par compétences, ADR 0109)
  prerequis/<famille>.yaml     graphe de prérequis proposé (chapitre ← prérequis, strict/souple), validé lien par lien
  contexte-local.yaml     exemples et repères locaux
  agents/<agent>/<unite>.yaml  valeurs injectées dans les prompts des agents (voir _modele/agents/README.md)
  faq.yaml                FAQ du Support (seules réponses possibles)
  recrutement.yaml        sources autorisées, canaux, relance, conditions, FAQ de recrutement (agent Recruteur)
  questionnaire.yaml      questionnaire anonyme du pilote (réponses fermées), montré seulement une fois « valide »
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

Aucune modification de code n'est nécessaire (ADR 0041, 0113). Rien n'est inventé : ce qui n'a pas de source officielle reste vide et se lit « manquant » dans `SOURCES.md`.

**Avant de commencer** : suivre le processus du cadrage (« Processus d'ajout d'un nouveau pays »). Il faut rassembler les sources officielles (programmes, structure du système, examens), constituer une équipe locale (au moins un enseignant-référent) et obtenir l'avis d'un juriste local (majorité, données des mineurs, durées de conservation).

1. **Créer le pack** à partir du modèle, avec le code ISO à deux lettres et le nom du pays :

   ```
   cd application
   pnpm pack:nouveau <dossier> <code> "<nom du pays>"    # par exemple : pnpm pack:nouveau senegal sn "Sénégal"
   ```

   Le dossier `referentiels/<dossier>/` est créé avec toutes les clés, vides. La commande refuse d'écraser un dossier existant. Elle affiche aussitôt le rapport de vérification.

2. **Remplir la fiche pays** (`pays.yaml`) : langue, indicatifs téléphoniques, **fuseau horaire**, référentiel et sa source. L'âge de la majorité et les durées de conservation viennent du juriste ; tant qu'ils sont vides, tout élève est traité comme mineur et rien n'est effacé.

3. **Décrire le système éducatif** (`structure.yaml`) :
   - les cycles et les classes (`niveaux`), dans l'ordre ;
   - les séries, et le mot du pays pour les désigner (`appellation_series` : « série », « option », « filière »…) ;
   - les examens.

4. **Matières, familles, unités** (`matieres.yaml`, `familles.yaml`, `unites.yaml`). Code d'unité : `<code>-<niveau>[-<groupe de séries>]-<matière>`.

5. **Programmes**, unité par unité : copier `_modele/gabarits/programme.yaml` vers `programmes/<unité>.yaml`. Chaque chapitre cite sa source. Le statut reste « a_valider » : seul le référent valide. Une unité sans programme s'affiche « Bientôt disponible ».

6. **Réglages des agents**. Copier les gabarits de `_modele/gabarits/agents/` (tableau dans `_modele/gabarits/README.md`) et remplir chaque valeur :
   - pour chaque unité qui a un programme : Professeur, Scénariste, Évaluateur, Production vidéo — sinon l'import est refusé ;
   - une fois par pays : Tuteur, Support, Conformité, Recruteur ;
   - pour chaque famille : Coordinateur.

7. **FAQ, contexte local, profils par niveau, questionnaire, recrutement** : à remplir avec l'équipe locale. Le Support ne répond qu'avec la FAQ. Le questionnaire et le recrutement restent inactifs tant qu'ils sont « a_valider ».

8. **Sources** : une ligne de `SOURCES.md` par donnée, avec son origine et son statut (validé, à valider, manquant).

9. **Vérifier**, à chaque étape :

   ```
   pnpm pack:verifier ../referentiels/<dossier>
   ```

   Le rapport classe chaque point en trois niveaux :
   - **bloquant** : l'import serait refusé ;
   - **à compléter** : sans cela, la plateforme ne sert pas vraiment ce pays ;
   - **à valider** : une décision humaine est attendue (référent, juriste, propriétaire).

   La commande sort en erreur tant qu'il reste un point bloquant.

10. **Importer** (voir plus haut) sur la base de développement, puis rejouer le parcours d'un élève de ce pays. En production : seulement avec l'accord du propriétaire, après validation par le référent.

Packs existants :

- `gabon/` : pilote, statut « en préparation ».
- `zz-fictif/` : **pays fictif de test** (statut `test`, ADR 0041). Il prouve qu'un second pays s'ajoute sans modifier le code. Le générateur le refuse sans l'option `--test` ; il n'est importé que par les tests et la base locale, jamais en production.
