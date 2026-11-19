// Crochet avant envoi (Jalon 17, étape 3 ; ADR 0097), facultatif : `pnpm controler:installer [--retirer]`.
// Pose (ou retire) un crochet git local « pre-push » qui lance `pnpm controler --rapide` avant chaque envoi.
// Un crochet « pre-push » qui ne vient pas de cette commande n'est jamais remplacé ni effacé.
import { spawnSync } from "node:child_process";
import {
  closeSync,
  fchmodSync,
  ftruncateSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { contenuCrochet, estNotreCrochet } from "../src/lib/exploitation/controle.ts";

const retirer = process.argv.includes("--retirer");
const r = spawnSync("git", ["rev-parse", "--git-path", "hooks/pre-push"], { encoding: "utf8" });
if (r.status !== 0) {
  console.error("Pas dans un dépôt git : rien n'est fait.");
  process.exit(2);
}
const chemin = resolve(r.stdout.trim());
// Un seul descripteur pour tout (alerte CodeQL du Jalon 25) : pour poser, le fichier est créé en exclusif
// (« wx »), ou, s'il existe déjà, ouvert puis lu, vérifié et réécrit par ce même descripteur. Aucun fichier glissé
// entre la vérification et l'écriture ne peut être remplacé.
const code = (e: unknown) => (e as NodeJS.ErrnoException).code;
/** Ouvre le crochet existant pour le lire et le réécrire ; null s'il n'existe pas. */
function ouvrirExistant(): number | null {
  try {
    return openSync(chemin, "r+");
  } catch (e) {
    if (code(e) === "ENOENT") return null;
    throw e;
  }
}
let descripteur: number | null = null;
let cree = false;
if (retirer) descripteur = ouvrirExistant();
else {
  mkdirSync(dirname(chemin), { recursive: true });
  try {
    descripteur = openSync(chemin, "wx", 0o755);
    cree = true;
  } catch (e) {
    if (code(e) !== "EEXIST") throw e;
    descripteur = ouvrirExistant();
  }
}
const existant = cree || descripteur === null ? null : readFileSync(descripteur, "utf8");

if (existant !== null && !estNotreCrochet(existant)) {
  console.error(
    `Un crochet « pre-push » existe déjà et ne vient pas de cette commande (${chemin}) : rien n'est fait.`,
  );
  process.exit(1);
}
if (retirer) {
  if (existant === null) console.log("Aucun crochet avant envoi à retirer.");
  else {
    rmSync(chemin);
    console.log("Crochet avant envoi retiré.");
  }
} else if (descripteur !== null) {
  ftruncateSync(descripteur, 0);
  writeSync(descripteur, contenuCrochet(), 0);
  fchmodSync(descripteur, 0o755);
  annoncer();
}
if (descripteur !== null) closeSync(descripteur);

function annoncer() {
  console.log(
    "Crochet avant envoi posé : `pnpm controler --rapide` avant chaque `git push`.\n" +
      "Passer outre une fois : git push --no-verify. Retirer : pnpm controler:installer --retirer",
  );
}
