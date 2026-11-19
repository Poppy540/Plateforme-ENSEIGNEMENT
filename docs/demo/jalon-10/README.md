# Captures du Jalon 10

Parcours sur téléphone simulé, avec des données fictives et des agents **simulés**. Les codes visibles sur les captures sont tirés pour la démonstration, sur une base locale effacée ensuite : ils ne donnent accès à rien. La skill « élèves mineurs » (étape 3) n'a pas d'écran propre : voir le [bilan](../../bilans/jalon-10.md).

Régénérables avec `cd application && pnpm demo:captures tests/demo/jalon-10.spec.ts`, puis `bash scripts/compresser-captures.sh ../docs/demo/jalon-10`. Le référentiel fictif `zz-general` n'apparaît qu'en développement : il n'est jamais importé en production.

| # | Capture |
|---|---|
| 01 | [Administration : liens « Inviter un référent » et « Classes du pilote »](01-administration-liens.png) |
| 02 | [Invitation d'un référent : familles de matières du référentiel, durée](02-invitation-formulaire.png) |
| 03 | [Code d'invitation affiché une seule fois](03-invitation-code-affiche-une-fois.png) |
| 04 | [Liste des invitations, sans les codes : utilisée (avec le prénom du référent), annulée](04-invitations-liste-sans-codes.png) |
| 05 | [Nouvelle classe : niveau, série, nom, établissement](05-classe-formulaire.png) |
| 06 | [Code de la classe et code de l'enseignant, affichés une seule fois](06-classe-deux-codes-affiches-une-fois.png) |
| 07 | [Liste des classes : élèves rattachés, validité du code, enseignant, actions](07-classes-liste-et-actions.png) |
