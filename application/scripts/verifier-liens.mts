// Liens internes de la documentation (Jalon 23, étape 3 ; ADR 0118) : pnpm verifier:liens
// Tous les fichiers Markdown suivis par git ; sortie 1 s'il reste un lien cassé.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { liensCasses } from "../src/lib/exploitation/liens.ts";

const depot = resolve(import.meta.dirname, "../..");
const fichiers = execFileSync("git", ["ls-files", "*.md"], { cwd: depot, encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
const casses = liensCasses(
  fichiers,
  (chemin) =>
    chemin.endsWith(".md") && existsSync(join(depot, chemin))
      ? readFileSync(join(depot, chemin), "utf8")
      : null,
  (chemin) => existsSync(join(depot, chemin)),
);
for (const c of casses) console.log(`${c.fichier}:${c.ligne} → ${c.cible} : ${c.raison}`);
console.log(
  casses.length === 0
    ? `Liens internes : ${fichiers.length} fichiers Markdown, aucun lien cassé.`
    : `${casses.length} lien(s) cassé(s) dans ${new Set(casses.map((c) => c.fichier)).size} fichier(s).`,
);
process.exit(casses.length === 0 ? 0 : 1);
