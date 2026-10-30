// Contrôle local unique (Jalon 17, étape 1 ; ADR 0094) : `pnpm controler [--rapide] [--liste]`.
// Vérifie d'abord les outils nécessaires, puis enchaîne les contrôles du niveau demandé (rapide : format, lint,
// types, unitaires ; complet par défaut : tout). Continue après un échec pour tout montrer, puis résume.
// La sortie de chaque contrôle est gardée dans .controles/<horodatage>/ (ignoré par git) ; à l'écran, seules les
// dernières lignes d'un contrôle en échec. N'affiche aucune variable d'environnement.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OUTILS,
  controlesDuNiveau,
  lignesUtiles,
  masquer,
  rapportMarkdown,
  valeursSensibles,
  empechement,
  ligneResultat,
  outilsDuNiveau,
  resume,
  type Niveau,
  type Outil,
  type Resultat,
} from "../src/lib/exploitation/controle.ts";

const application = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
if (args.includes("--aide") || args.some((a) => !["--rapide", "--liste"].includes(a))) {
  console.log(
    "Usage : pnpm controler [--rapide] [--liste]\n" +
      "  (sans option) contrôle complet, avant chaque déploiement\n" +
      "  --rapide      format, lint, types, unitaires : avant chaque envoi\n" +
      "  --liste       montre les contrôles et les outils, sans rien lancer",
  );
  process.exit(args.includes("--aide") ? 0 : 2);
}
const niveau: Niveau = args.includes("--rapide") ? "rapide" : "complet";

// --- Outils ---------------------------------------------------------------------------------------------------

const dansLeChemin = (programme: string) =>
  spawnSync("sh", ["-c", `command -v ${programme}`], { stdio: "ignore" }).status === 0;

function dossierPostgres(): string | null {
  const candidats = [process.env.PG_BIN];
  if (existsSync("/usr/lib/postgresql"))
    candidats.push(
      ...readdirSync("/usr/lib/postgresql")
        .sort((a, b) => Number(b) - Number(a))
        .map((v) => `/usr/lib/postgresql/${v}/bin`),
    );
  return candidats.find((d) => d && existsSync(join(d, "initdb"))) ?? null;
}

function postgresPresent(): boolean {
  const dossier = dossierPostgres();
  const present = (p: string) => (dossier && existsSync(join(dossier, p))) || dansLeChemin(p);
  if (!dossier && !dansLeChemin("initdb")) return false;
  if (!["pg_ctl", "psql", "pg_dump", "pg_restore"].every(present)) return false;
  // En root, les scripts lancent Postgres sous l'utilisateur « postgres ».
  return (
    process.getuid?.() !== 0 || spawnSync("id", ["postgres"], { stdio: "ignore" }).status === 0
  );
}

async function cheminChromium(): Promise<string | null> {
  const indique = process.env.CHEMIN_CHROMIUM;
  if (indique) return existsSync(indique) ? indique : null;
  try {
    const { chromium } = await import("@playwright/test");
    if (existsSync(chromium.executablePath())) return chromium.executablePath();
  } catch {
    // Playwright absent : signalé par l'outil « dépendances ».
  }
  // Navigateur installé par une autre version de Playwright (dossier partagé des navigateurs).
  const dossier =
    process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(process.env.HOME ?? "", ".cache/ms-playwright");
  if (!existsSync(dossier)) return null;
  for (const version of readdirSync(dossier)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1])))
    for (const sous of ["chrome-linux64/chrome", "chrome-linux/chrome"]) {
      const chemin = join(dossier, version, sous);
      if (existsSync(chemin)) return chemin;
    }
  return null;
}

const portOccupe = (port: number) =>
  new Promise<boolean>((resoudre) => {
    const s = createConnection({ port, host: "127.0.0.1" });
    s.once("connect", () => (s.destroy(), resoudre(true)));
    s.once("error", () => resoudre(false));
  });

const chromium = await cheminChromium();
const presents: Record<Outil, () => boolean> = {
  node: () => Number(process.versions.node.split(".")[0]) >= 20,
  dependances: () => existsSync(join(application, "node_modules/.bin/next")),
  postgres: postgresPresent,
  age: () => dansLeChemin("age") && dansLeChemin("age-keygen"),
  chromium: () => chromium !== null,
};

console.log(`Contrôle ${niveau} — outils nécessaires :`);
const manquants = new Set<Outil>();
for (const outil of outilsDuNiveau(niveau)) {
  const ok = presents[outil]();
  if (!ok) manquants.add(outil);
  console.log(
    `  ${ok ? "présent " : "MANQUANT"} ${OUTILS[outil].nom}${ok ? "" : ` → ${OUTILS[outil].installer}`}`,
  );
}

const controles = controlesDuNiveau(niveau);
const portsOccupes = new Set<number>();
for (const port of new Set(controles.flatMap((c) => c.ports ?? [])))
  if (await portOccupe(port)) portsOccupes.add(port);

if (args.includes("--liste")) {
  console.log("\nContrôles :");
  for (const c of controles) {
    const raison = empechement(c, manquants, portsOccupes);
    console.log(
      `  ${raison ? "ne pourra pas être lancé" : "prêt"} — ${c.nom}${raison ? ` : ${raison}` : ""}`,
    );
  }
  process.exit(0);
}

// --- Lancement ------------------------------------------------------------------------------------------------

const debutControle = new Date().toISOString();
const horodatage = debutControle.replace(/[:.]/g, "-").slice(0, 19);
const dossierSorties = join(application, ".controles", horodatage);
mkdirSync(dossierSorties, { recursive: true });

// État git au début : un contrôle ne vaut pour un commit que si la copie de travail était propre.
const git = (...a: string[]) => {
  const r = spawnSync("git", a, { cwd: application, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
};
const commit = git("rev-parse", "HEAD");
const branche = git("rev-parse", "--abbrev-ref", "HEAD");
const copiePropre = commit !== null && git("status", "--porcelain") === "";

// Aucune valeur de variable sensible dans les sorties gardées, à l'écran ni dans le rapport.
const sensibles = valeursSensibles(process.env);

// La base locale de développement est réinitialisée par les tests de bout en bout : arrêtée à la fin si elle ne
// tournait pas avant.
const baseLocaleAvant = await portOccupe(Number(process.env.PG_PORT_LOCAL ?? 54330));

function lancer(commande: string[]): Promise<{ code: number; sortie: string }> {
  return new Promise((resoudre) => {
    const env: NodeJS.ProcessEnv = { ...process.env, FORCE_COLOR: "0" };
    if (chromium) env.CHEMIN_CHROMIUM = chromium;
    const enfant = spawn("pnpm", ["run", "--silent", ...commande], { cwd: application, env });
    let sortie = "";
    enfant.stdout.on("data", (d) => (sortie += d));
    enfant.stderr.on("data", (d) => (sortie += d));
    enfant.on("close", (code) => resoudre({ code: code ?? 1, sortie }));
    enfant.on("error", (e) => resoudre({ code: 1, sortie: String(e) }));
  });
}

console.log(`\n${controles.length} contrôles ; sorties dans .controles/${horodatage}/\n`);
const resultats: Resultat[] = [];
for (const c of controles) {
  const raison = empechement(c, manquants, portsOccupes);
  if (raison) {
    resultats.push({ code: c.code, nom: c.nom, etat: "non_lance", dureeMs: 0, detail: raison });
    console.log(ligneResultat(resultats.at(-1)!));
    continue;
  }
  // Ligne « en cours » effacée ensuite, seulement dans un terminal (pas dans un fichier ni en intégration continue).
  const terminal = process.stdout.isTTY;
  if (terminal) process.stdout.write(`…        ${c.nom}`);
  const debut = performance.now();
  const { code, sortie } = await lancer(c.commande);
  const sortieMasquee = masquer(sortie, sensibles);
  writeFileSync(join(dossierSorties, `${c.code}.log`), sortieMasquee);
  const r: Resultat = {
    code: c.code,
    nom: c.nom,
    etat: code === 0 ? "reussi" : "echec",
    dureeMs: performance.now() - debut,
    detail: code === 0 ? null : lignesUtiles(sortieMasquee),
  };
  resultats.push(r);
  if (terminal) process.stdout.write("\r\u001b[K");
  console.log(ligneResultat(r));
  if (r.detail) console.log(r.detail.replace(/^/gm, "    │ "));
}

if (!baseLocaleAvant && resultats.some((r) => r.code === "bout_en_bout" && r.etat !== "non_lance"))
  spawnSync("bash", ["scripts/base-locale.sh", "arreter"], { cwd: application, stdio: "ignore" });

const bilan = resume(resultats, niveau);
const rapport = rapportMarkdown(
  { date: debutControle, niveau, commit, branche, copiePropre },
  resultats,
);
writeFileSync(join(dossierSorties, "rapport.md"), rapport);
console.log(`\n${bilan.texte}`);
console.log(`Rapport : .controles/${horodatage}/rapport.md`);
if (!copiePropre)
  console.log(
    "Copie de travail modifiée : ce contrôle ne vaut pas pour le commit (le paquet ne le retiendra pas).",
  );
process.exit(bilan.codeSortie);
