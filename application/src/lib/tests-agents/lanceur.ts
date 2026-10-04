// Lanceur des batteries de tests des agents (prompt maître §2, cadrage Partie D, tests/config.yaml).
// Chaque scénario est exécuté plusieurs fois ; une exécution réussit si les contrôles automatiques passent
// ET si l'évaluateur la juge conforme. Seuils : 100 % pour les interdits, au moins 90 % pour la pédagogie.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { parse } from "yaml";
import { composerPrompt, dossierPack } from "../agents/chargeur-prompt.ts";
import type { Modele } from "../agents/modele.ts";
import { repondre, type ParametresModele } from "../agents/professeur/boucle.ts";
import type { AppelOutil } from "../agents/professeur/outils.ts";
import { lirePack } from "../pack-pays/lecture.ts";
import { coutUSD, type Consommation } from "./cout.ts";
import { lireScenarios, type ScenarioGherkin } from "./gherkin.ts";
import type { Juge } from "./juge.ts";
import { controler, fusionner, type Verifications } from "./verifications.ts";

export interface ConfigurationTests {
  executions_par_test: number;
  seuils: { interdit: number; pedagogie: number };
  evaluation: { echantillon_relecture_humaine: number };
}

export function lireConfiguration(racine: string): ConfigurationTests {
  return parse(readFileSync(join(racine, "tests", "config.yaml"), "utf8")) as ConfigurationTests;
}

interface EntreeScenario {
  chapitre?: string;
  tours: string[];
  verifications?: Verifications;
}

interface FichierEntrees {
  unite: string;
  chapitre_par_defaut: string;
  verifications_communes?: Verifications;
  scenarios: Record<string, EntreeScenario>;
}

export interface Execution {
  numero: number;
  transcription: string;
  controlesEchoues: string[];
  verdict: "reussi" | "echec" | "erreur";
  justification: string;
}

export interface ResultatScenario {
  scenario: ScenarioGherkin;
  executions: Execution[];
  tauxReussite: number;
  seuil: number;
  conforme: boolean;
}

export interface Rapport {
  agent: string;
  simulation: boolean;
  modeleAgent: string;
  modeleJuge: string;
  date: string;
  resultats: ResultatScenario[];
  nonConvertis: string[];
  echantillon: { scenario: string; numero: number; transcription: string }[];
  coutUSD: number;
}

export interface OptionsLancement {
  racine: string;
  agent: "professeur";
  ids?: string[];
  executions: number;
  configuration: ConfigurationTests;
  modele: Modele;
  parametres: ParametresModele;
  juge: Juge;
  modeleJuge: string;
  simulation: boolean;
  /** Tirage de l'échantillon à relire (remplaçable pour des tests reproductibles). */
  aleatoire?: () => number;
  journal?: (ligne: string) => void;
}

/** Scénarios applicables : batterie commune (TC) + batteries propres à l'agent. */
export function chargerBatteries(racine: string, agent: string): ScenarioGherkin[] {
  const dossier = join(racine, "agents", agent, "tests");
  const fichiers = [
    join(racine, "tests", "commun", "TC.feature"),
    ...readdirSync(dossier)
      .filter((f) => f.endsWith(".feature"))
      .map((f) => join(dossier, f)),
  ];
  return fichiers.flatMap((f) => lireScenarios(f));
}

export function chargerEntrees(racine: string, agent: string): FichierEntrees {
  const fichier = join(racine, "agents", agent, "tests", "entrees.yaml");
  if (!existsSync(fichier)) throw new Error(`Entrées des scénarios absentes : ${fichier}`);
  return parse(readFileSync(fichier, "utf8")) as FichierEntrees;
}

const SKILLS = {
  professeur: [
    "_commun/skills/contenu-non-fiable",
    "professeur/skills/echelle-d-indices",
    "professeur/skills/diagnostic-d-erreur",
  ],
};

export async function lancer(options: OptionsLancement): Promise<Rapport> {
  const journal = options.journal ?? (() => undefined);
  const aleatoire = options.aleatoire ?? Math.random;
  const entrees = chargerEntrees(options.racine, options.agent);
  const codePays = entrees.unite.split("-")[0];
  const pack = lirePack(dossierPack(options.racine, codePays));
  const chapitres = pack.programmes[entrees.unite] ?? [];
  const systeme = composerPrompt(
    {
      agent: options.agent,
      codePays,
      unite: entrees.unite,
      skills: SKILLS[options.agent],
      // En test, tous les chapitres du programme sont considérés comme validés.
      valeursDynamiques: {
        LISTE_CHAPITRES: chapitres.map((c) => c.titre).join(" ; "),
        CHAPITRE_EN_COURS: "en cours (voir le contexte de la session)",
      },
    },
    options.racine,
  );

  const toutes = chargerBatteries(options.racine, options.agent);
  const choisies = toutes.filter((s) => !options.ids || options.ids.includes(s.id));
  const nonConvertis = choisies.filter((s) => !entrees.scenarios[s.id]).map((s) => s.id);
  const consommationsAgent: Consommation[] = [];
  const consommationsJuge: Consommation[] = [];
  const resultats: ResultatScenario[] = [];

  for (const scenario of choisies.filter((s) => entrees.scenarios[s.id])) {
    const entree = entrees.scenarios[scenario.id];
    const codeChapitre = entree.chapitre ?? entrees.chapitre_par_defaut;
    const titreChapitre = chapitres.find((c) => c.code === codeChapitre)?.titre ?? codeChapitre;
    const verifications = fusionner(entrees.verifications_communes, entree.verifications);
    const executions: Execution[] = [];

    for (let numero = 1; numero <= options.executions; numero++) {
      const historique: BetaMessageParam[] = [];
      const lignes: string[] = [];
      const reponses: string[] = [];
      const appels: AppelOutil[] = [];
      try {
        for (const tour of entree.tours) {
          const sortie = await repondre({
            systeme,
            contexteSession: `# CONTEXTE DE LA SESSION\nChapitre en cours : « ${titreChapitre} ».`,
            historique,
            question: tour,
            modele: options.modele,
            parametres: options.parametres,
            // Aucune écriture réelle : les appels d'outils sont seulement enregistrés.
            executerOutil: async (appel) => {
              appels.push(appel);
              return appel.nom === "signaler"
                ? "Signalement transmis à un humain."
                : "Progression enregistrée.";
            },
            emettre: () => undefined,
          });
          consommationsAgent.push(...sortie.consommations);
          reponses.push(sortie.texte);
          lignes.push(`Élève : ${tour}`);
          for (const appel of sortie.appels)
            lignes.push(`[outil ${appel.nom} ${JSON.stringify({ ...appel, nom: undefined })}]`);
          lignes.push(
            `Professeur : ${sortie.texte || "(aucun texte)"}${sortie.arret !== "fin" ? ` [arrêt : ${sortie.arret}]` : ""}`,
          );
          historique.push({ role: "user", content: tour });
          if (sortie.texte.trim()) historique.push({ role: "assistant", content: sortie.texte });
        }
        const transcription = lignes.join("\n");
        const controlesEchoues = controler(verifications, reponses, appels);
        const jugement = await options.juge(scenario, transcription);
        if (jugement.consommation) consommationsJuge.push(jugement.consommation);
        executions.push({
          numero,
          transcription,
          controlesEchoues,
          verdict:
            controlesEchoues.length === 0 && jugement.verdict === "reussi" ? "reussi" : "echec",
          justification: jugement.justification,
        });
      } catch (erreur) {
        executions.push({
          numero,
          transcription: lignes.join("\n"),
          controlesEchoues: [],
          verdict: "erreur",
          justification: `Erreur d'exécution : ${(erreur as Error).name}`,
        });
      }
      journal(`${scenario.id} #${numero} : ${executions.at(-1)!.verdict}`);
    }

    const reussites = executions.filter((e) => e.verdict === "reussi").length;
    const seuil = options.configuration.seuils[scenario.categorie];
    const tauxReussite = executions.length === 0 ? 0 : reussites / executions.length;
    resultats.push({ scenario, executions, tauxReussite, seuil, conforme: tauxReussite >= seuil });
  }

  // Échantillon d'exécutions pédagogiques à faire relire par un humain (prof-référent).
  const pedagogiques = resultats
    .filter((r) => r.scenario.categorie === "pedagogie")
    .flatMap((r) =>
      r.executions.map((e) => ({
        scenario: r.scenario.id,
        numero: e.numero,
        transcription: e.transcription,
      })),
    );
  const taille =
    pedagogiques.length === 0
      ? 0
      : Math.max(
          1,
          Math.ceil(
            pedagogiques.length * options.configuration.evaluation.echantillon_relecture_humaine,
          ),
        );
  const echantillon = [...pedagogiques].sort(() => aleatoire() - 0.5).slice(0, taille);

  const coutTotal =
    consommationsAgent.reduce((s, c) => s + coutUSD(options.parametres.modele, c), 0) +
    consommationsJuge.reduce((s, c) => s + coutUSD(options.modeleJuge, c), 0);

  return {
    agent: options.agent,
    simulation: options.simulation,
    modeleAgent: options.parametres.modele,
    modeleJuge: options.modeleJuge,
    date: new Date().toISOString(),
    resultats,
    nonConvertis,
    echantillon,
    coutUSD: coutTotal,
  };
}

export function rapportMarkdown(r: Rapport): string {
  const pourcent = (x: number) => `${Math.round(x * 100)} %`;
  const conformes = r.resultats.filter((x) => x.conforme).length;
  const lignes = [
    `# Rapport de tests — agent ${r.agent}`,
    "",
    r.simulation
      ? "> **SIMULATION** : modèle et évaluateur simulés. Ce rapport vérifie seulement la mécanique, il ne dit RIEN de la qualité de l'agent."
      : `> Modèle de l'agent : ${r.modeleAgent} · évaluateur : ${r.modeleJuge} · coût mesuré : ${r.coutUSD.toFixed(2)} USD`,
    "",
    `Date : ${r.date} · scénarios conformes : **${conformes} / ${r.resultats.length}**`,
    "",
    "| Scénario | Catégorie | Réussite | Seuil | Résultat |",
    "|---|---|---|---|---|",
    ...r.resultats.map(
      (x) =>
        `| ${x.scenario.id} | ${x.scenario.categorie} | ${pourcent(x.tauxReussite)} (${x.executions.filter((e) => e.verdict === "reussi").length}/${x.executions.length}) | ${pourcent(x.seuil)} | ${x.conforme ? "conforme" : "**NON CONFORME**"} |`,
    ),
    "",
  ];
  if (r.nonConvertis.length > 0) {
    lignes.push(
      `Scénarios sans entrées concrètes (non exécutés) : ${r.nonConvertis.join(", ")}`,
      "",
    );
  }
  const echecs = r.resultats.flatMap((x) =>
    x.executions.filter((e) => e.verdict !== "reussi").map((e) => ({ x, e })),
  );
  if (echecs.length > 0) {
    lignes.push("## Exécutions en échec", "");
    for (const { x, e } of echecs) {
      lignes.push(
        `### ${x.scenario.id} — exécution ${e.numero} (${e.verdict})`,
        "",
        `- Attendu : ${x.scenario.attendu}`,
        `- Échec si : ${x.scenario.echec}`,
        ...e.controlesEchoues.map((c) => `- Contrôle automatique : ${c}`),
        `- Évaluateur : ${e.justification}`,
        "",
        "```",
        e.transcription,
        "```",
        "",
      );
    }
  }
  if (r.echantillon.length > 0) {
    lignes.push("## Échantillon à faire relire par l'enseignant-référent", "");
    for (const e of r.echantillon) {
      lignes.push(
        `### ${e.scenario} — exécution ${e.numero}`,
        "",
        "```",
        e.transcription,
        "```",
        "",
        "Avis du référent : ……",
        "",
      );
    }
  }
  return lignes.join("\n");
}
