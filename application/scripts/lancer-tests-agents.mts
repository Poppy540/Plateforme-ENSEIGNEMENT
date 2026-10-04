// Lanceur des tests des agents.
//   pnpm test:agents [--agent scenariste]             simulation (aucun appel, aucun coût) : vérifie la mécanique
//   MODE_MODELE=anthropic pnpm test:agents --estimer  estimation du coût d'un passage réel, sans rien lancer
//   MODE_MODELE=anthropic pnpm test:agents --confirmer [--scenarios PR-01,PR-02] [--executions 1]
//                                                     passage réel (payant) — uniquement avec l'accord du propriétaire
// Le rapport est écrit dans tests/resultats/<date>/ (ignoré par git : il contient des transcriptions).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { composerPrompt } from "../src/lib/agents/chargeur-prompt.ts";
import { modeleAnthropic } from "../src/lib/agents/modele.ts";
import { modeleSimule } from "../src/lib/agents/modele-simule.ts";
import { estimerUSD } from "../src/lib/tests-agents/cout.ts";
import { jugeAnthropic, jugeSimule } from "../src/lib/tests-agents/juge.ts";
import {
  chargerBatteries,
  chargerEntrees,
  lancer,
  lireConfiguration,
  rapportMarkdown,
} from "../src/lib/tests-agents/lanceur.ts";

const args = process.argv.slice(2);
const option = (nom: string) => {
  const i = args.indexOf(nom);
  return i >= 0 ? args[i + 1] : undefined;
};
const racine = resolve(process.env.CHEMIN_DEPOT ?? "..");
const agent = option("--agent") ?? "professeur";
if (agent !== "professeur" && agent !== "scenariste" && agent !== "evaluateur") {
  console.error(`Agent inconnu : ${agent} (professeur, scenariste ou evaluateur).`);
  process.exit(2);
}
// Paramètres du modèle de l'agent testé (mêmes variables d'environnement que le serveur).
const PREFIXE = agent.toUpperCase();
const PAR_DEFAUT = {
  professeur: { effort: "medium", maxTokens: 16000, sortieParTour: 2000, entreeJugement: 2500 },
  scenariste: { effort: "high", maxTokens: 64000, sortieParTour: 12000, entreeJugement: 9000 },
  // Moyenne entre création de quiz (~8 000 jetons) et correction (~1 500).
  evaluateur: { effort: "high", maxTokens: 64000, sortieParTour: 6000, entreeJugement: 6000 },
}[agent];
const configuration = lireConfiguration(racine);
const reel = (process.env.MODE_MODELE ?? "simulation") === "anthropic";
const ids = option("--scenarios")
  ?.split(",")
  .map((s) => s.trim());
const executions = Number(option("--executions") ?? configuration.executions_par_test);
const parametres = {
  modele: process.env[`MODELE_${PREFIXE}`] ?? "claude-opus-5-5",
  effort: (process.env[`EFFORT_${PREFIXE}`] ?? PAR_DEFAUT.effort) as "medium",
  maxTokens: Number(process.env[`MAX_JETONS_${PREFIXE}`] ?? PAR_DEFAUT.maxTokens),
};
const modeleJuge = process.env.MODELE_JUGE ?? "claude-opus-5-5";

// Estimation (toujours affichée avant un passage réel).
const entrees = chargerEntrees(racine, agent);
const scenarios = chargerBatteries(racine, agent).filter(
  (s) => (!ids || ids.includes(s.id)) && entrees.scenarios[s.id],
);
const toursTotal =
  scenarios.reduce((s, sc) => {
    const e = entrees.scenarios[sc.id];
    if (agent === "professeur") return s + (e.tours ?? []).length;
    if (agent === "evaluateur") return s + (e.quiz ?? []).length + (e.corrections ?? []).length;
    return s + (e.generations ?? [{}]).length;
  }, 0) * executions;
const prompt = composerPrompt(
  {
    agent,
    codePays: entrees.unite.split("-")[0],
    unite: entrees.unite,
    skills: [],
    valeursDynamiques: { LISTE_CHAPITRES: "x", CHAPITRE_EN_COURS: "x", DUREE: "x" },
  },
  racine,
);
const estimation = estimerUSD({
  modeleAgent: parametres.modele,
  modeleJuge,
  jetonsPrompt: Math.ceil((prompt.length + 15000) / 3.2),
  toursTotal,
  jugements: scenarios.length * executions,
  sortieParTour: PAR_DEFAUT.sortieParTour,
  entreeJugement: PAR_DEFAUT.entreeJugement,
});
console.log(
  `Agent ${agent} : ${scenarios.length} scénarios × ${executions} exécutions (${toursTotal} ${agent === "professeur" ? "tours d'élève" : "appels à l'agent"}). Estimation d'un passage réel : ~${estimation.toFixed(2)} USD.`,
);

if (reel && !args.includes("--confirmer")) {
  console.log(
    "Passage réel non lancé : ajouter --confirmer, avec l'accord du propriétaire sur ce coût.",
  );
  process.exit(0);
}
if (args.includes("--estimer")) process.exit(0);

const rapport = await lancer({
  racine,
  agent,
  ids,
  executions,
  configuration,
  modele: reel ? modeleAnthropic : modeleSimule,
  parametres,
  juge: reel ? jugeAnthropic(modeleJuge) : jugeSimule,
  modeleJuge,
  simulation: !reel,
  journal: (l) => console.log(l),
});

const dossier = join(
  racine,
  "tests",
  "resultats",
  `${rapport.date.replace(/[:.]/g, "-")}-${agent}`,
);
mkdirSync(dossier, { recursive: true });
writeFileSync(join(dossier, "rapport.md"), rapportMarkdown(rapport));
writeFileSync(join(dossier, "resultats.json"), JSON.stringify(rapport, null, 2));
const nonConformes = rapport.resultats.filter((r) => !r.conforme).map((r) => r.scenario.id);
console.log(`Rapport : ${join(dossier, "rapport.md")}`);
console.log(
  nonConformes.length === 0
    ? "Tous les scénarios sont conformes."
    : `NON CONFORMES : ${nonConformes.join(", ")}`,
);
if (!reel)
  console.log(
    "(Simulation : la conformité ci-dessus ne dit rien de la qualité réelle de l'agent.)",
  );
process.exit(nonConformes.length === 0 ? 0 : 1);
