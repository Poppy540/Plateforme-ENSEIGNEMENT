// Vérification d'un pack pays (Jalon 22, étape 3 ; ADR 0113) : pnpm pack:verifier <dossier du pack>
// Lecture seule. Code de sortie 1 s'il reste un point bloquant (l'import serait refusé).
import { basename, resolve } from "node:path";
import { rapportEnTexte, verifierPack } from "../src/lib/pack-pays/verification.ts";

const dossier = process.argv[2];
if (!dossier) {
  console.error("Usage : pnpm pack:verifier <dossier du pack, par exemple ../referentiels/<pays>>");
  process.exit(2);
}
const rapport = verifierPack(
  resolve(dossier),
  resolve(import.meta.dirname, "../../referentiels/_modele/gabarits"),
);
console.log(rapportEnTexte(basename(resolve(dossier)), rapport));
process.exit(rapport.constats.some((c) => c.niveau === "bloquant") ? 1 : 0);
