// Usage : node scripts/pack-en-sql.mts <dossier du pack> > import.sql
// Puis : psql "<connexion>" -f import.sql (base de développement ou, avec accord, de production).
import { resolve } from "node:path";
import { ErreurPack, lirePack } from "../src/lib/pack-pays/lecture.ts";
import { packEnSql } from "../src/lib/pack-pays/sql.ts";

const dossier = process.argv[2];
if (!dossier) {
  console.error(
    "Usage : node scripts/pack-en-sql.mts <dossier du pack, par exemple ../referentiels/gabon>",
  );
  process.exit(2);
}

try {
  process.stdout.write(packEnSql(lirePack(resolve(dossier))));
} catch (erreur) {
  console.error(erreur instanceof ErreurPack ? erreur.message : erreur);
  process.exit(1);
}
