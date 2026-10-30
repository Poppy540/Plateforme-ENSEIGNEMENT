# Mesures en faible débit — Jalon 18, étape 1

**Date** : 2026-10-30 · **Outil** : `cd application && pnpm mesurer:pages` (`tests/mesures/pages.spec.ts`) · **Tableau complet** : [`mesures-pages.md`](mesures-pages.md) (et `mesures-pages.json`) · Données fictives, téléphone simulé, serveur de production local.

## 1. Ce qui a été mesuré

- **41 pages** sur les 47 de l'application, pour les cinq publics : visiteur, élève, parent, enseignant, référent, administration. Les 6 pages non mesurées sont listées à la fin du tableau, avec la raison : elles demandent une vidéo, un document officiel, un rapport du Coordinateur ou une fiche candidat, ou ont le même gabarit qu'une page mesurée.
- Pour chaque page :
  - les **octets réellement passés par le réseau** au premier chargement, téléphone vide, en comptant les préchargements des pages liées ;
  - les mêmes octets quand la page est **rouverte** ;
  - le **temps d'affichage** (premier contenu visible) et le **temps avant usage** (page chargée, scripts exécutés), sur deux réseaux simulés :
    - « 3G lente » : 400 kbit/s, 400 ms de latence ;
    - « 2G » : 250 kbit/s, 600 ms de latence, celle du test de connexion de l'ADR 0044.

    Le processeur est ralenti quatre fois, comme sur un téléphone d'entrée de gamme.

## 2. Résultats

| Mesure                    | Toutes les pages                                      | Budget actuel (ADR 0044)             |
| ------------------------- | ----------------------------------------------------- | ------------------------------------ |
| Premier chargement        | **146 à 158 Ko** (référent et administration en haut) | 200 Ko (5 pages publiques seulement) |
| Page rouverte             | **0 à 13 Ko**                                         | —                                    |
| Affichage, 3G lente / 2G  | **0,9 à 1,1 s / 1,4 à 1,6 s**                         | —                                    |
| Utilisable, 3G lente / 2G | **4,0 à 4,2 s / 6,2 à 6,4 s**                         | connexion : moins de 20 s en 2G      |

**Aucune page ne dépasse le budget de 200 Ko.** Les pages des élèves et des parents sont toutes entre 146 et 151 Ko.

## 3. Ce qui pèse

Sur chaque page, **139 à 144 Ko sont du JavaScript**, presque entièrement commun à toutes les pages :

| Fichier (compressé)      | Contenu                                          | Ko     |
| ------------------------ | ------------------------------------------------ | ------ |
| socle React              | affichage et hydratation (react-dom)             | 72     |
| socle Next.js            | navigation entre pages (routeur, préchargement)  | 36     |
| autres morceaux du socle | runtime, React                                   | 22     |
| code de la plateforme    | lecture hors ligne (service worker), formulaires | 5 à 15 |

Le document HTML lui-même pèse 3 à 12 Ko, et les données préchargées 0 à 6 Ko.

**Conséquences :**

- **L'élève lit vite.** Les pages sont rendues par le serveur : le texte s'affiche en 1 à 1,5 s, même en 2G, avant que le JavaScript soit arrivé.
- **Les boutons attendent le JavaScript.** Le temps « utilisable » (4 s en 3G lente, 6,3 s en 2G) est presque entièrement le temps de télécharger et d'exécuter les ~140 Ko du socle. Il est le même sur toutes les pages.
- **La deuxième visite est presque gratuite.** Les fichiers statiques sont gardés un an sur le téléphone (en-tête `immutable`) et servis par le service worker : une page rouverte coûte 0 à 13 Ko.
- **Le socle ne se réduit pas facilement.** React et Next.js font environ 125 Ko compressés, quelle que soit la page. Le baisser fortement demanderait de changer de cadre technique, ce qui n'est pas proposé. La marge d'allègement est donc dans notre propre code (5 à 15 Ko par page) et dans les pages les plus lourdes (référent, administration).

## 4. Erreurs corrigées dans la mesure elle-même

Le premier passage annonçait jusqu'à 480 Ko au deuxième chargement d'une page. C'était faux. Pour un fichier servi par le cache, la mesure prenait sa taille décompressée, alors que rien ne passait par le réseau. Un diagnostic requête par requête l'a montré : environ 1 Ko réel. L'outil compte désormais les octets réellement passés par le réseau, d'après le protocole du navigateur.

Le test de poids de l'ADR 0044 (`poids-pages.spec.ts`) utilise la même méthode imprécise. Elle ne pose pas de problème au premier chargement, mais elle sera alignée sur l'outil à l'étape 2.

## 5. Proposition pour l'étape 2 (budgets)

Tirée des mesures, avec une marge d'environ 10 % :

| Public                               | Premier chargement | Page rouverte | Affichage en 2G | Utilisable en 2G |
| ------------------------------------ | ------------------ | ------------- | --------------- | ---------------- |
| Visiteur, élève, parent              | 160 Ko             | 20 Ko         | 2 s             | 7,5 s            |
| Enseignant, référent, administration | 175 Ko             | 30 Ko         | 2 s             | 7,5 s            |

C'est plus strict que les 200 Ko actuels, pour qu'une page qui grossit se voie tout de suite. Chaque page aura son budget, vérifié par les tests de bout en bout et donc par `pnpm controler` ; une page nouvelle sans budget fera échouer les tests.

## 6. Pistes pour l'étape 3 (allègement)

- Le composant de lecture hors ligne (5 Ko) est chargé sur toutes les pages, y compris l'administration, où il ne sert pas.
- Les pages les plus lourdes sont l'espace du référent (158 Ko, document de 12 Ko) et le tableau de l'administration (155 Ko) : des listes longues à paginer ou à replier.
- Le préchargement automatique des pages liées ne coûte que 0 à 6 Ko : il est gardé, car il rend la page suivante instantanée.
