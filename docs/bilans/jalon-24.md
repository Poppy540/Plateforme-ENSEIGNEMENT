# Bilan du Jalon 24

**Dates** : 2026-11-12 au 2026-11-16 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; rien n'est déployé ni souscrit.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0119) : relire, avant d'accueillir de vrais élèves mineurs, tout ce qui a été ajouté depuis la revue de sécurité du Jalon 16, et corriger ce qui doit l'être.

| Étape du plan                | État           | Remarque                                                                                                                                               |
| ---------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Revue                     | **Faite**      | [`docs/securite/revue-jalon-24.md`](../securite/revue-jalon-24.md) : 0 critique, 0 élevé, 1 moyen, 7 faibles, 7 pour information.                      |
| 2. Corrections               | **Faite**      | Les 13 constats sans décision sont corrigés, chacun avec un test ; migration 0051 (ADR 0120).                                                          |
| 3. Décisions du propriétaire | **Faite**      | D17 a (limite d'un téléphone sans réseau dite à l'élève et aux familles), D18 oui (clé des sauvegardes interdite en lecture à Claude Code) (ADR 0121). |
| 4. Passages réels des agents | **En attente** | Clé API, relecture des deux skills, accord sur le coût (~121 USD).                                                                                     |
| 5. Bilan                     | **Fait**       | Ce document et une capture ([`docs/demo/jalon-24/`](../demo/jalon-24/README.md)).                                                                      |

## 2. Ce qui a changé

- **Supprimer son compte efface aussi le téléphone.** Les conversations, les corrections et le plan gardés pour la lecture sans réseau restaient lisibles jusqu'à 7 jours après la suppression du compte. C'était le seul constat moyen.
- **La limite d'un téléphone perdu est dite** dans « Mes données » et dans la fiche des familles, et le dossier du juriste la décrit.
- **Les messages passés dans l'adresse sont signés** : un lien fabriqué ne peut plus faire afficher un faux message (« appelez tel numéro ») dans l'administration ou chez le référent.
- **La base** :
  - un élève ne peut plus marquer « commencé » un chapitre d'un autre pays ;
  - la dernière place d'une classe se prend sous verrou ;
  - un contrôle automatique vérifie aussi les droits accordés colonne par colonne.
- **Les outils** :
  - le contrôle « base locale seulement » ne se laisse plus tromper par une adresse piégée ;
  - les rapports de contrôle masquent davantage de mots de passe.
- **GitHub** :
  - la clé API n'est donnée qu'aux étapes qui l'utilisent ;
  - aucun jeton ne reste sur le disque ;
  - la clé privée et les sauvegardes sont exclues du dépôt public, où qu'elles soient.
- **Le téléphone** : les copies hors ligne gardent les protections de sécurité de la page d'origine.

## 3. Constats

- **Rien de grave n'a été trouvé.** Les règles des revues précédentes tiennent :
  - les 157 fonctions privilégiées de la base sont protégées ;
  - les visiteurs non connectés n'accèdent qu'à ce qui est prévu ;
  - aucun secret ni donnée réelle n'est dans l'historique du dépôt public.
- **Un problème était plus large que relevé** : les messages lus dans l'adresse concernaient 8 pages d'administration et une page du référent, pas une seule. Aucune page d'élève n'était concernée.
- **Le dossier du juriste décrivait déjà** le marquage « commencé » ; seuls un commentaire de code et une décision écrite (ADR 0103) étaient faux.
- **Un oubli du Jalon 22, trouvé par la capture de ce bilan** : quatre textes écrivaient encore « série » en dur (« Mes données », l'accord du parent, l'exemple de la page d'aide, une catégorie de tickets). Pour un élève du pays Z, il faut lire « option ». Corrigés : « Mes données » affiche la classe avec le mot du pays (« 5e », « Année 4 — option Sciences »).
- **Méthode** : trois relectures indépendantes, en parallèle, sans rien modifier. J'ai revérifié chaque constat dans le code, et reproduit le contournement de l'adresse piégée.

## 4. Ce que vérifient les tests

| Série            | Nombre                                                                                                                                             | Commande         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Tests unitaires  | Tous passés (dont adresses piégées, messages signés, flux GitHub, fichiers ignorés)                                                                | `pnpm test`      |
| Tests de base    | Tous passés, dont PC05 (chapitre d'un autre pays) et GF03 étendu                                                                                   | `pnpm test:base` |
| Contrôle complet | 11 / 11 réussis (étapes 2 et 3)                                                                                                                    | `pnpm controler` |
| Bout en bout     | Dont suppression du compte qui efface le téléphone, copies hors ligne avec leur politique de contenu, message fabriqué refusé, phrase D17 affichée | `pnpm test:e2e`  |
| GitHub Actions   | Application, tests des agents et CodeQL verts (`9283151`, `75fbe3e`)                                                                               | —                |

## 5. Coûts

| Poste                                           | Estimation                        | Statut                                                    |
| ----------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| Passages réels complets de toutes les batteries | ~121 USD                          | Non lancés : clé, relecture des skills et accord attendus |
| Dépenses du jalon                               | 0 USD ; aucune dépendance ajoutée | —                                                         |

## 6. Décisions et actions attendues du propriétaire

**Rien de nouveau.** Vos décisions D17 et D18 sont appliquées. Le dossier pour le juriste a deux précisions :

- la suppression du compte efface aussi les copies du téléphone ;
- un téléphone resté sans réseau garde ses copies au plus 7 jours.

Pensez à envoyer cette version.

Le reste est dans [Ce qui vous attend](../attentes-proprietaire.md). D'abord : le juriste, la lettre de demande du curriculum, le premier référent, la relecture des deux skills, la clé API et l'accord sur le coût, les réglages GitHub. Un test d'intrusion par une société extérieure reste à décider après le déploiement.
