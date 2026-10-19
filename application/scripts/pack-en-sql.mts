// Usage : node scripts/pack-en-sql.mts <dossier du pack> [--test] > import.sql
// Un pack au statut « test » (pays fictif) n'est accepté qu'avec --test : tests et base locale seulement.
// Puis : psql "<connexion>" -f import.sql (base de développement ou, avec accord, de production).
import { resolve } from "node:path";
import { ErreurPack, lirePack } from "../src/lib/pack-pays/lecture.ts";
import { packEnSql } from "../src/lib/pack-pays/sql.ts";

const dossier = process.argv.slice(2).find((a) => !a.startsWith("--"));
const accepterTest = process.argv.includes("--test");
if (!dossier) {
  console.error(
    "Usage : node scripts/pack-en-sql.mts <dossier du pack, par exemple ../referentiels/gabon>",
  );
  process.exit(2);
}

try {
  const pack = lirePack(resolve(dossier));
  if (pack.pays.statutPack === "test" && !accepterTest) {
    console.error(
      `Pack de test « ${pack.pays.code} » refusé : il ne s'importe qu'avec --test (jamais en production).`,
    );
    process.exit(1);
  }
  process.stdout.write(packEnSql(pack));
} catch (erreur) {
  console.error(erreur instanceof ErreurPack ? erreur.message : erreur);
  process.exit(1);
}
