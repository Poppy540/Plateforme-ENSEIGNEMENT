# 0100 — Scripts envoyés en brotli, préparés dans le paquet

- **Date** : 2026-10-30 · **Statut** : accepté (Jalon 18, étape 3)

## Contexte

Le diagnostic de l'étape 3 a séparé, page par page, ce qui est commun de ce qui est propre à chaque page :

- **socle commun** (React et Next.js) : 135 Ko compressés, identiques sur toutes les pages ;
- **code propre à une page** : 4 à 8 Ko ;
- **la page elle-même** (HTML) : 3 à 11 Ko.

Alléger notre code ne gagnerait donc que quelques Ko par page. La piste « composant hors ligne sur toutes les pages » (étape 1) était fausse : il n'est chargé que là où il sert.

Le seul levier important est la compression du socle. Next.js n'envoie que du gzip. Le répartiteur Caddy compresse en zstd, mais il ne recompresse pas une réponse déjà compressée par Next.js : en production, tout partait en gzip. Mesuré sur le socle :

| gzip   | zstd (niveau 19) | brotli (qualité 11) |
| ------ | ---------------- | ------------------- |
| 131 Ko | 121 Ko           | **113 Ko**          |

## Décision

- **`pnpm paquet` précompresse** chaque script et feuille de style du paquet en brotli, qualité maximale : un fichier `.br` à côté de l'original (`scripts/precompresser.mts`, zlib de Node, aucune dépendance). Il affiche le gain, aujourd'hui 13 % sur l'ensemble des fichiers.
- **Le répartiteur sert ces fichiers directement** (`deploiement/Caddyfile.exemple`) : `/_next/static/*` est lu dans le paquet, avec `precompressed br`, et gardé un an (`immutable`). Le reste passe aux deux processus de l'application, comme avant.
- **`pnpm verifier:site` le contrôle sur le site réel** : un script de la page d'accueil doit partir en brotli ou en zstd et être gardé un an ; sinon, un avertissement.
- **Hébergement sans serveur** (Vercel, Cloudflare) : ces hébergeurs servent déjà les fichiers statiques en brotli ; le contrôle de `verifier:site` vaut aussi pour eux.

## Conséquences

- Premier chargement d'une page : environ 18 Ko de moins, soit 0,6 s de moins environ en 2G.
- Les budgets (ADR 0099) restent mesurés sans répartiteur, donc en gzip : le gain est une marge de plus en production.
- L'exemple Caddy n'a pas pu être essayé ici, Caddy n'étant pas installé. C'est `verifier:site` qui le confirmera sur le site déployé.
