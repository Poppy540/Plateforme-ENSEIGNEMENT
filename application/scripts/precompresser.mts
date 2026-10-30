// Précompression des fichiers statiques du paquet (Jalon 18, étape 3 ; ADR 0100) : à côté de chaque script et
// feuille de style, une copie .br (brotli, qualité maximale), servie telle quelle par le répartiteur
// (deploiement/Caddyfile.exemple, « precompressed br »). Next.js ne sait envoyer que du gzip ; brotli fait
// ~14 % de moins sur le socle commun de toutes les pages. Aucune dépendance : zlib de Node.
// Usage : node scripts/precompresser.mts <dossier .next/static du paquet>
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const dossier = process.argv[2];
if (!dossier) {
  console.error("Usage : node scripts/precompresser.mts <dossier>");
  process.exit(2);
}
let fichiers = 0;
let gzip = 0;
let brotli = 0;
for (const nom of readdirSync(dossier, { recursive: true, encoding: "utf8" })) {
  if (!/\.(js|css)$/.test(nom)) continue;
  const chemin = join(dossier, nom);
  const contenu = readFileSync(chemin);
  const br = brotliCompressSync(contenu, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
      [constants.BROTLI_PARAM_SIZE_HINT]: contenu.length,
    },
  });
  writeFileSync(`${chemin}.br`, br);
  fichiers += 1;
  gzip += gzipSync(contenu, { level: 9 }).length;
  brotli += br.length;
}
if (fichiers === 0) {
  console.error(`Aucun script ni feuille de style dans ${dossier}.`);
  process.exit(1);
}
const ko = (n: number) => Math.round(n / 1024);
console.log(
  `Précompression brotli : ${fichiers} fichiers, ${ko(brotli)} Ko (gzip : ${ko(gzip)} Ko, ${Math.round((100 * (gzip - brotli)) / gzip)} % de moins).`,
);
