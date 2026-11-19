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
  writeFileSync,
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
// Le crochet existant est lu et, s'il est le nôtre, réécrit par le même descripteur : aucun fichier glissé entre
// la vérification et l'écriture ne peut être remplacé (alerte CodeQL du Jalon 25).
let descripteur: number | null = null;
try {
  descripteur = openSync(chemin, "r+");
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
const existant = descripteur === null ? null : readFileSync(descripteur, "utf8");

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
} else if (descripteur === null) {
  mkdirSync(dirname(chemin), { recursive: true });
  // « wx » : création seulement ; échoue si un fichier est apparu entre-temps.
  writeFileSync(chemin, contenuCrochet(), { flag: "wx", mode: 0o755 });
  annoncer();
} else {
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
