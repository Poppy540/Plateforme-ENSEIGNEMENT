# Plan du Jalon 16 — revue de sécurité des Jalons 9 à 15

**Statut** : validé par le propriétaire le 2026-10-29 (décisions ci-dessous, ADR 0091). Étape 1 faite (`docs/securite/revue-jalon-16.md` : 0 critique, 0 élevé, 2 moyens, 5 faibles, 2 informations ; décisions D10 à D12 proposées).

**Objectif** : la dernière revue de sécurité et de confidentialité date du Jalon 5 (ADR 0043, `docs/securite/revue-jalon-5.md`). Depuis, les Jalons 9 à 15 ont ajouté :

- 13 migrations (0034 à 0046) ;
- une vingtaine de fonctions d'administration en base (`security definer`) ;
- un rôle `enseignant` ;
- des codes d'invitation et de classe ;
- des textes libres (preuves, motifs, journal du pilote) ;
- des exports (Markdown, CSV) ;
- des outils d'exploitation (migrations, sauvegarde, paquet, répétition, vérification de site).

Le Jalon 16 relit tout cela **avant le premier déploiement**, corrige ce qui doit l'être et ajoute des garde-fous automatiques. **Rien n'est déployé ni souscrit.**

**Principes inchangés** :

- données fictives seulement ;
- aucun secret lu ni affiché ;
- aucun prompt d'agent modifié ;
- une correction qui change le comportement visible ou une règle du pilote passe par vous.

## Étapes (dans cet ordre)

| #   | Étape                     | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Besoin du propriétaire           |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 0   | Plan                      | Ce plan, l'ADR 0091 et `memory.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Validation (faite)               |
| 1   | Revue                     | Relecture de bout en bout, consignée dans `docs/securite/revue-jalon-16.md`, sur la même grille qu'au Jalon 5. **Base** : pour chaque fonction `security definer` des migrations 0034 à 0046, la vérification du rôle passe en premier, le `search_path` est fixé et les droits d'exécution sont limités. On vérifie aussi les données individuelles visibles, les textes libres (masquage, longueur) et le journal d'audit (aucune donnée nominative). **Serveur** : routes et actions (session, rôle, origine), exports, codes à usage unique (empreintes, expiration, tentatives), limites de débit. **Exploitation** : paquet sans secret, sauvegardes (droits, chiffrement), journaux, répétition. Chaque constat est classé (critique, élevé, moyen, faible), avec une correction proposée. | —                                |
| 2   | Corrections et garde-fous | Les constats qui ne demandent pas de décision sont corrigés, chacun avec un test. S'y ajoutent des **garde-fous automatiques** dans les tests de base : toute fonction `security definer` a un `search_path` fixé et n'est exécutable ni par `public` ni par `anon` (sauf une liste blanche justifiée) ; aucune table nouvelle n'est lisible sans règle d'accès ; etc. Ainsi, une future migration qui oublie une règle fait échouer les tests.                                                                                                                                                                                                                                                                                                                                                   | —                                |
| 3   | Décisions du propriétaire | Les constats qui touchent une règle, un comportement visible ou un coût vous sont présentés : choix possibles et recommandation, comme les décisions D1 à D9 du Jalon 5. Ils sont appliqués après vos réponses.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Vos choix                        |
| 4   | Passages réels des agents | Repris des Jalons 11 à 15 : dès que la clé, la relecture des skills et l'accord sont là, mini-essais, puis séries complètes (~121 USD) après un nouvel accord.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Clé API ; accord sur chaque coût |
| 5   | Bilan                     | Bilan comme aux jalons précédents, avec des captures si des écrans changent. Le dossier pour le juriste et `docs/attentes-proprietaire.md` sont mis à jour si la revue le demande.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | —                                |

L'étape 4 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-10-29)

1. **Piste retenue** : revue de sécurité des Jalons 9 à 15.
2. **Écartés pour ce jalon** :
   - la commande unique de contrôles locaux ;
   - la skill « faible débit » ;
   - une nouvelle matière de 3e.

## Hors Jalon 16

- Un audit externe (test d'intrusion) : à envisager après le déploiement, avec votre accord sur le coût.
- Le déploiement et toute souscription.
- Le déblocage de GitHub Actions (réglage du compte, par le propriétaire).
