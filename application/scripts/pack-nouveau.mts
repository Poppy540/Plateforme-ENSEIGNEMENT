// « Ajouter un pays » (Jalon 22, étape 3 ; ADR 0113) : pnpm pack:nouveau <dossier> <code> "<nom du pays>"
// Copie referentiels/_modele/ vers referentiels/<dossier>/ avec le code et le nom posés, puis dit ce qui reste.
import { resolve } from "node:path";
import { creerPack } from "../src/lib/pack-pays/nouveau.ts";
import { rapportEnTexte, verifierPack } from "../src/lib/pack-pays/verification.ts";

const [dossier, code, nom] = process.argv.slice(2);
if (!dossier || !code || !nom) {
  console.error('Usage : pnpm pack:nouveau <dossier> <code à 2 lettres> "<nom du pays>"');
  process.exit(2);
}
const referentiels = resolve(import.meta.dirname, "../../referentiels");
try {
  const cible = creerPack(referentiels, dossier, code, nom);
  console.log(`Pack créé : ${cible}\n`);
  console.log(
    rapportEnTexte(dossier, verifierPack(cible, resolve(referentiels, "_modele/gabarits"))),
  );
  console.log(`
Suite : remplir les fichiers à partir des sources officielles (guide : referentiels/README.md, « Ajouter un pays »),
puis relancer pnpm pack:verifier ../referentiels/${dossier} jusqu'à ce qu'il n'y ait plus rien de bloquant.`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
