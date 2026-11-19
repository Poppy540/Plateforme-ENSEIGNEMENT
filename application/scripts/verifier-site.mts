// Vérification d'un site déployé, en lecture seule (ADR 0073).
//   pnpm verifier:site https://adresse-du-site
//   pnpm verifier:site http://localhost:3100 --local     essai local (http accepté)
// Code de sortie non nul si un contrôle est en échec. Aucune valeur secrète n'est lue ni affichée.
import { rapportVerification, verifierSite } from "../src/lib/exploitation/verification-site.ts";

const adresse = process.argv[2];
if (!adresse || !/^https?:\/\//.test(adresse)) {
  console.error("Usage : pnpm verifier:site https://adresse-du-site [--local]");
  process.exit(2);
}
const controles = await verifierSite(adresse, fetch, {
  autoriserHttpLocal: process.argv.includes("--local"),
});
console.log(rapportVerification(adresse, controles));
process.exit(controles.some((c) => c.niveau === "echec") ? 1 : 0);
