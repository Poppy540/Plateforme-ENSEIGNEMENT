// Vérification du dépôt GitHub (Jalon 20, étape 3 ; ADR 0107) : `pnpm verifier:depot [propriétaire/dépôt]`.
// Lecture seule, sans jeton ; dépôt tiré de `git remote get-url origin` par défaut.
import { execFileSync } from "node:child_process";
import {
  A_VERIFIER_A_LA_MAIN,
  depotDepuisRemote,
  verifierDepot,
} from "../src/lib/exploitation/verification-depot.ts";
import { rapportVerification } from "../src/lib/exploitation/verification-site.ts";

let depot: string | null = process.argv[2] ?? null;
if (!depot) {
  try {
    depot = depotDepuisRemote(
      execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }),
    );
  } catch {
    depot = null;
  }
}
if (!depot) {
  console.error("Usage : pnpm verifier:depot <propriétaire/dépôt>");
  process.exit(2);
}
const controles = await verifierDepot(depot, fetch);
console.log(
  rapportVerification(`https://github.com/${depot}`, controles)
    .replace(
      /^Vérification de .*$/m,
      `Vérification du dépôt github.com/${depot} (lecture seule, API publique)`,
    )
    .replace("Site conforme", "Dépôt conforme"),
);
console.log(
  `\nÀ vérifier à la main (invisible sans droits d'administration) :\n- ${A_VERIFIER_A_LA_MAIN.join("\n- ")}`,
);
console.log("Guide : docs/securite/reglages-github.md");
process.exit(controles.some((c) => c.niveau === "echec") ? 1 : 0);
