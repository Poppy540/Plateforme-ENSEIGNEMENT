// Usage : node scripts/pack-en-sql.mts <dossier du pack> [--test] > import.sql
// Un pack au statut « test » (pays fictif) n'est accepté qu'avec --test : tests et base locale seulement.
// Puis : psql "<connexion>" -f import.sql (base de développement ou, avec accord, de production).
import { resolve } from "node:path";
import { reglagesAgentsManquants } from "../src/lib/pack-pays/agents-des-unites.ts";
import { ErreurPack, lirePack } from "../src/lib/pack-pays/lecture.ts";
import { packEnSql } from "../src/lib/pack-pays/sql.ts";

const dossier = process.argv.slice(2).find((a) => !a.startsWith("--"));
const accepterTest = process.argv.includes("--test");
if (!dossier) {
  console.error(
    "Usage : node scripts/pack-en-sql.mts <dossier du pack, par exemple ../referentiels/<pays>>",
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
  const manquants = reglagesAgentsManquants(resolve(dossier), pack);
  if (manquants.length > 0) {
    console.error(
      `Unités avec un programme mais sans réglages d'agents (le référent ne pourrait pas demander de quiz ni de script) :\n${manquants.map((m) => `  - ${m}`).join("\n")}`,
    );
    process.exit(1);
  }
  process.stdout.write(packEnSql(pack));
} catch (erreur) {
  console.error(erreur instanceof ErreurPack ? erreur.message : erreur);
  process.exit(1);
}
