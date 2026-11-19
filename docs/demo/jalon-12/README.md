# Captures du Jalon 12

Parcours sur téléphone simulé, avec des données fictives. Les étapes 1 à 3 (migrations suivies, paquet de déploiement, répétition générale) sont des commandes sans écran : voir le [bilan](../../bilans/jalon-12.md).

Régénérables avec `cd application && pnpm demo:captures tests/demo/jalon-12.spec.ts`, puis `bash scripts/compresser-captures.sh ../docs/demo/jalon-12`.

| # | Capture |
|---|---|
| 01 | [Au départ : 0 / 12 conditions remplies](01-conditions-au-depart.png) |
| 02 | [Conditions 3 et 4 vérifiées par la plateforme (référent actif, 3 chapitres prêts)](02-conditions-3-et-4-verifiees-par-la-plateforme.png) |
| 03 | [Cocher une condition avec une preuve datée (le numéro sera masqué)](03-cocher-avec-une-preuve.png) |
| 04 | [Condition mixte cochée mais « À revoir » : variables du serveur à régler, noms seulement](04-condition-mixte-a-revoir.png) |
| 05 | [Tableau complet : 5 / 12 conditions remplies](05-tableau-des-conditions.png) |

Le champ de date suit la langue du navigateur : il s'affiche au format anglais dans le navigateur des captures, au format français chez les utilisateurs francophones.
