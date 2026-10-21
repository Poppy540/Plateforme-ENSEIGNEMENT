# 0049 — Décisions de la revue de sécurité (D1 à D9)

- **Date** : 2026-10-21 · **Statut** : appliqué (Jalon 6, étape 1). Ce sont les propositions de la revue, retenues par le propriétaire (« mes propositions », ADR 0048) ; toutes restent réglables.

## Contexte

La revue de sécurité du Jalon 5 (`docs/securite/revue-jalon-5.md`, ADR 0043) a laissé neuf points à la décision du propriétaire.

## Décision

| # | Ce qui est fait | Réglage |
|---|---|---|
| D1 | `pnpm verifier:production` appelle la racine de l'API de données de Supabase avec la clé publique. Si elle décrit les tables, l'API est ouverte : la vérification échoue. Aucune valeur n'est affichée. | Dossier de production §2.2 |
| D2 | À la suppression d'un compte, les résumés de ses signalements et tickets sont **effacés** si le pack le demande. Sinon ils sont gardés, détachés du compte (comportement actuel). | `pays.yaml` : `resumes_apres_suppression` (`garder` ou `effacer`) ; null en attendant le juriste |
| D3 | Purge étendue (`purger_donnees_etendues`, lancée par `pnpm donnees:purger`) : signalements traités, tickets résolus, candidats refusés ou supprimés (l'opposition reste), rapports aux parents, sessions closes. Les signalements et tickets gardent leur pays à la création, pour être retrouvés même après la suppression du compte. | `pays.yaml` : quatre durées, **null** (rien n'est effacé) tant que le juriste ne les a pas fixées |
| D4 | Empreintes de la liste d'opposition salées par `SEL_OPPOSITION`. Le sel est transmis par le serveur pour la transaction et n'est jamais stocké en base : une copie de la base ne suffit plus pour retrouver une adresse. Sans sel, la base refuse de calculer une empreinte. Les anciennes empreintes, non salées, restent reconnues. | `SEL_OPPOSITION` : à fixer une fois, **ne jamais le changer** |
| D5 | Un code de connexion, une demande d'accord ou un rapport aux parents ne part que vers un numéro dont l'indicatif est déclaré par un pack pays importé. Sans aucun indicatif déclaré, seule la simulation accepte un numéro. | `pays.yaml` : `indicatifs_telephone` |
| D6 | Les sessions sont tenues en base ; le cookie signé porte l'identifiant de la session, vérifiée à chaque requête. Elles se ferment à la déconnexion, par « Me déconnecter de tous mes appareils » ou depuis l'administration en cas d'incident (toutes sauf la sienne). La durée dépend du rôle et suit un changement de rôle. | `SESSION_ELEVE_HEURES` (720), `SESSION_REFERENT_HEURES` (168), `SESSION_ADMINISTRATION_HEURES` (12) |
| D7 | Un référent ne lit que les approbations des chapitres de ses familles (et les siennes). Il ne lit plus aucun signalement : la file humaine, avec l'élève concerné, reste à l'administration. | — |
| D8 | Politique de contenu à nonce, posée par `src/proxy.ts` sur chaque page. Les scripts ne passent que par le nonce ou `'strict-dynamic'`, jamais en ligne sans nonce. Toutes les pages sont rendues à la demande (`connection()` dans la disposition racine). Les styles gardent `'unsafe-inline'`, sans exécution de code. Les routes d'API ont `default-src 'none'`. | — |
| D9 | Le propriétaire supprime un document officiel depuis `/administration`. Ses rapports d'écart partent avec lui et la suppression est tracée au journal d'audit. L'export « Mes données » couvre aussi les référents et l'administration : familles, décisions de validation, documents déposés, signalements traités (sans le résumé). | — |

## Conséquences

- Ce qu'il reste au propriétaire :
  - fixer `SEL_OPPOSITION` en production ;
  - faire décider au juriste D2 et les durées de D3, puis planifier la purge ;
  - fermer l'API de données (vérifiée par `pnpm verifier:production`).
- Les cookies de session antérieurs ne sont plus acceptés : chacun se reconnecte une fois.
- Une requête de base de plus par page (vérification de la session), mise en cache pour la durée de la requête.
- Plus aucune page pré-rendue : le coût est faible, la plupart des pages lisaient déjà la session.
- Le code d'envoi des SMS de connexion est géré par Supabase : un appel direct à l'API d'authentification de Supabase ne passe pas par ce contrôle. Restreindre aussi les pays dans la configuration SMS de Supabase ou du fournisseur (dossier de production).
