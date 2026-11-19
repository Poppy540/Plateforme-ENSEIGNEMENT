// Audit des dépendances (Jalon 20, étape 1 ; ADR 0105) : `pnpm audit:dependances`, lancé aussi par
// `pnpm controler`. Échoue sur une faille élevée ou critique sans exception valide (exceptions-audit.json).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { juger, lireAudit, rapportAudit, type Exception } from "../src/lib/exploitation/audit.ts";

const application = join(dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync("pnpm", ["audit", "--json"], { cwd: application, encoding: "utf8" });
let json: unknown;
try {
  json = JSON.parse(r.stdout);
} catch {
  console.error("Audit impossible : le registre des paquets n'a pas répondu (réseau ?).");
  console.error(r.stderr.split("\n").slice(-5).join("\n"));
  process.exit(1);
}
const exceptions = JSON.parse(
  readFileSync(join(application, "exceptions-audit.json"), "utf8"),
) as Exception[];
const verdict = juger(lireAudit(json), exceptions, new Date().toISOString().slice(0, 10));
console.log(rapportAudit(verdict));
process.exit(verdict.ok ? 0 : 1);
