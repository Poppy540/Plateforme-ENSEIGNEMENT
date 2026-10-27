# 0066 — Invitations de référents depuis l'administration

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 10, étape 1).

## Contexte

Jusqu'ici, pour inviter un référent, le propriétaire lançait `pnpm referent:invitation` puis appliquait un fichier SQL sur la base de production (ADR 0016). C'était source d'erreurs, et cela demandait un accès à la base qu'il vaut mieux réserver aux migrations (ADR 0065).

## Décision

1. **Page `/administration/invitations`**, réservée au rôle administrateur. Elle contient un formulaire par référentiel : les familles de matières de ce référentiel (lues en base, libellées d'après le pack) et la durée de validité (1 à 60 jours).
2. **Code tiré par le serveur**, de la même forme qu'avant. Il est affiché **une seule fois**, dans la réponse du formulaire : il ne passe ni par l'adresse de la page, ni par la base, ni par le journal. La base ne reçoit que son empreinte SHA-256, comme avec la commande.
3. **Fonctions en base** (migration 0036), qui vérifient toutes le rôle administrateur :
   - `options_invitation_referent` ;
   - `creer_invitation_referent` : référentiel connu, familles du référentiel, durée, empreinte de 64 caractères hexadécimaux ;
   - `invitations_referents_admin` : liste sans les codes ; état en attente, utilisée, expirée ou annulée ; prénom du référent qui l'a utilisée ;
   - `annuler_invitation_referent` : seulement une invitation en attente, qui expire alors aussitôt. `activer_referent` la refuse donc sans changement.
4. **Journal d'audit** : la création et l'annulation sont tracées, avec l'empreinte de l'administrateur, le référentiel, les familles et la durée. **Jamais le code.**
5. La commande `pnpm referent:invitation` reste, en secours.

## Conséquences

- Le propriétaire n'a plus besoin d'accéder à la base pour inviter un référent.
- Un administrateur dont la session serait volée pourrait créer des invitations. Les garde-fous sont :
  - des sessions d'administration de 12 heures (ADR 0049) ;
  - la fermeture de toutes les sessions en cas d'incident ;
  - le journal d'audit ;
  - une invitation en attente qui s'annule en un clic.
- Tests : base U01 à U03 ; bout en bout `invitations-administration.spec.ts` (refus sans famille, code affiché une fois puis plus jamais, activation par le référent, annulation, accès refusé aux autres comptes, audit d'accessibilité).
