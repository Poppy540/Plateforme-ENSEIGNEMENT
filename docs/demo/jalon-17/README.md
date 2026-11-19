# Démonstration du Jalon 17

Aucun écran ne change dans ce jalon : pas de captures. Voici en exemple le rapport écrit par `pnpm controler` lors du contrôle complet du commit final de l'étape 3 : [`exemple-rapport-controle-complet.md`](exemple-rapport-controle-complet.md).

- La première ligne est un commentaire lisible par la machine, invisible à l'affichage. `pnpm paquet` le lit pour savoir si le commit a passé le contrôle complet.
- Un nouveau rapport s'obtient avec `cd application && pnpm controler`, puis se lit dans `application/.controles/<horodatage>/rapport.md`.
