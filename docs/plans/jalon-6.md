# Plan du Jalon 6 — sécurité finale, contenus et préparation du pilote

**Statut** : validé par le propriétaire le 2026-10-20 (décisions ci-dessous, ADR 0048). Étape 1 faite (décisions D1 à D9 de la revue de sécurité, ADR 0049).

**Objectif** : rendre la plateforme prête pour le pilote, pour tout ce qui ne dépend que de Claude Code :
- les décisions de la revue de sécurité (D1 à D9) ;
- une deuxième famille de matières ;
- des leçons lisibles sans vidéo ;
- des mesures pour le bilan du pilote ;
- une répétition complète du pilote.

**Principe inchangé** : tout est construit en simulation, avec des données fictives. Rien n'est déployé ni souscrit, et aucune dépense n'est faite sans l'accord du propriétaire.

## Étapes (dans cet ordre)

| # | Étape | Contenu | Besoin du propriétaire |
|---|---|---|---|
| 0 | Plan | Ce plan, l'ADR 0048 et `memory.md`. | Validation (faite) |
| 1 | Décisions de la revue de sécurité | Propositions de `docs/securite/revue-jalon-5.md` appliquées, réglables par configuration ou par le pack : <br>• D1 : API de données fermée, contrôle ajouté à `pnpm verifier:production` si c'est faisable sans afficher de valeur ;<br>• D4 : sel secret `SEL_OPPOSITION` (hors dépôt), empreintes existantes recalculées ;<br>• D5 : indicatifs SMS autorisés lus dans le pack pays ;<br>• D6 : révocation des sessions en base, sessions plus courtes pour les référents et l'administration ;<br>• D7 : lecture des référents limitée à leurs familles, sans l'identifiant de l'élève ;<br>• D8 : politique de contenu à nonce ;<br>• D9 : suppression des documents par le propriétaire, export pour référents et administration.<br>D2 et D3 (durées, purge étendue) : mécanisme préparé, durées et activation en attente du juriste. | Valeurs à confirmer plus tard ; juriste pour D2 et D3 |
| 2 | Passages réels des agents | Inséré dès que la clé et l'accord sont là : mini-essais (quelques USD), puis batteries complètes (~105 USD) après un nouvel accord. Je corrige les skills, les entrées et les contrôles du serveur, jamais les prompts sans accord. | Clé API ; accord sur chaque coût |
| 3 | Famille Sciences en 3e | Physique-chimie et SVT 3e dans le pack Gabon, avec des programmes **provisoires** repris du cadrage (`SOURCES.md` : à valider) ; prérequis intra-famille ; valeurs des agents ; Coordinateur de la famille Sciences, et contrôles entre familles (liens vers les Mathématiques). | Référent de Sciences ; programmes IPN |
| 4 | Leçons écrites | Version texte de chaque chapitre, tirée du script **validé** (statut, version et empreinte vérifiés). Elle est légère, lisible hors ligne (même cache que les chapitres) et sert de repli sans vidéo. Pas de nouveau contenu : seulement le texte validé. | — |
| 5 | Mesures pour le bilan du pilote | Compteur de visionnage **agrégé** par chapitre et par jour, sans identifiant d'élève, masqué sous 5. Questionnaire de satisfaction **anonyme** et court (élèves, parents) : questions dans le pack pays, réponses sans lien avec le compte, ajoutées à l'export agrégé. | Validation des questions |
| 6 | Préparation du pilote | Point sur les conditions 1 à 12 de `docs/pilote/README.md`. Répétition complète sur la base locale : inscription et accord parental, cours, quiz, Tuteur, veille de détresse, incident (suspension, interrupteur). Guide de l'enseignant-référent. | — |
| 7 | Tests, démonstration, bilan | Comme aux jalons précédents. | — |

L'étape 2 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-10-20)

1. **Ordre** : la sécurité d'abord, puis les contenus, les leçons, les mesures et la préparation du pilote.
2. **Contenus** : Sciences 3e (physique-chimie et SVT), deuxième famille de matières.
3. **Revue de sécurité** : les propositions de la revue sont appliquées, réglables ensuite ; D2 et D3 attendent le juriste.
4. **Mesures** : compteur de visionnage agrégé et questionnaire anonyme.

## Hors Jalon 6

- WhatsApp.
- Paiements (pilote gratuit, ADR 0013).
- Vraies vidéos (fournisseurs).
- Mise en production.
- Pilote réel.
- Vrai second pays.
- Mathématiques série B.
- Français.
