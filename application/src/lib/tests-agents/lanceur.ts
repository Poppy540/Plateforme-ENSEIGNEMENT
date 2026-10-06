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
import { genererScript, messageDemande } from "../agents/scenariste/generation.ts";
import { scriptEnTexte, type SortieScenariste } from "../agents/scenariste/script.ts";
import {
  corrigerReponse,
  messageCorrection,
  type Correction,
} from "../agents/evaluateur/correction.ts";
import { genererQuiz, messageDemandeQuiz } from "../agents/evaluateur/generation.ts";
import { quizEnTexte, type Question, type SortieQuiz } from "../agents/evaluateur/quiz.ts";
import {
  candidatsDeRevision,
  type Candidat,
  type ChapitreParcours,
} from "../agents/tuteur/analyse.ts";
import { genererPlan, messageDemandePlan, type PlanTuteur } from "../agents/tuteur/plan.ts";
import { lirePack } from "../pack-pays/lecture.ts";
import { coutUSD, type Consommation } from "./cout.ts";
import { lireScenarios, type ScenarioGherkin } from "./gherkin.ts";
import type { Juge } from "./juge.ts";
import {
  controler,
  controlerEvaluateur,
  controlerTuteur,
  fusionner,
  type SortieControlee,
  type Verifications,
} from "./verifications.ts";

export interface ConfigurationTests {
  executions_par_test: number;
  seuils: { interdit: number; pedagogie: number };
  evaluation: { echantillon_relecture_humaine: number };
}

export function lireConfiguration(racine: string): ConfigurationTests {
  return parse(readFileSync(join(racine, "tests", "config.yaml"), "utf8")) as ConfigurationTests;
}

/** Une demande de script (agent Scénariste) ; tout est facultatif, les défauts viennent du fichier. */
export interface Generation {
  chapitre?: string;
  /** Chapitre absent du programme (SC-02) ou ajouté au programme pour le test (titre libre, fictif). */
  chapitre_hors_programme?: string;
  chapitre_ajoute?: string;
  sous_themes?: string[];
  duree?: number;
  consigne?: string;
  /** Valeurs du pack remplacées pour ce test (par exemple un autre niveau pour SC-07). */
  valeurs?: Record<string, string>;
}

/** Une demande de quiz (agent Évaluateur). */
export interface DemandeQuizTest {
  chapitre?: string;
  chapitre_hors_programme?: string;
  nombre?: number;
  difficulte?: "facile" | "moyen" | "difficile" | "variee";
  consigne?: string;
}

/** Une correction de réponse courte (agent Évaluateur), éventuellement contestée. */
export interface CorrectionTest {
  question: Partial<Question> & { enonce: string; reponse_attendue: string; explication: string };
  reponse: string;
  /** Contestation : correction précédente (résultat) et messages successifs de l'élève. */
  contestation?: { resultat: Correction["resultat"]; messages: string[] };
}

/** Parcours fictif d'un élève (agent Tuteur). */
export interface ParcoursTest {
  chapitres?: {
    titre: string;
    unite?: string;
    classe_inferieure?: boolean;
    statut?: ChapitreParcours["statut"];
    score?: number | null;
  }[];
  /** Liens [chapitre, prérequis] (titres). */
  prerequis?: [string, string][];
  minutes?: number | null;
  connexion?: string | null;
  jours_sans_activite?: number;
  message?: string;
}

interface EntreeScenario {
  chapitre?: string;
  tours?: string[];
  generations?: Generation[];
  quiz?: DemandeQuizTest[];
  corrections?: CorrectionTest[];
  parcours?: ParcoursTest;
  verifications?: Verifications;
}

export interface FichierEntrees {
  unite: string;
  /** Agent Tuteur : parcours fictif commun, complété ou remplacé par chaque scénario. */
  parcours_par_defaut?: ParcoursTest;
  chapitre_par_defaut: string;
  duree_par_defaut?: number;
  verifications_communes?: Verifications;
  /** Scénarios de la batterie commune qui ne concernent pas cet agent, avec la raison. */
  non_applicables?: Record<string, string>;
  scenarios: Record<string, EntreeScenario>;
}

export type AgentTeste = "professeur" | "scenariste" | "evaluateur" | "tuteur";

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
  nonApplicables: Record<string, string>;
  echantillon: { scenario: string; numero: number; transcription: string }[];
  coutUSD: number;
}

export interface OptionsLancement {
  racine: string;
  agent: AgentTeste;
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

const SKILLS: Record<AgentTeste, string[]> = {
  professeur: [
    "_commun/skills/contenu-non-fiable",
    "professeur/skills/echelle-d-indices",
    "professeur/skills/diagnostic-d-erreur",
  ],
  scenariste: [
    "_commun/skills/contenu-non-fiable",
    "scenariste/skills/script-pense-a-voix-haute",
    "scenariste/skills/ancrage-local",
  ],
  evaluateur: ["_commun/skills/contenu-non-fiable", "evaluateur/skills/questions-de-controle"],
  tuteur: ["_commun/skills/contenu-non-fiable"],
};

interface ResultatExecution {
  transcription: string;
  reponses: string[];
  appels: AppelOutil[];
  sorties: SortieControlee[];
  quiz: (SortieQuiz | null)[];
  corrections: (Correction | null)[];
  plans: { plan: PlanTuteur | null; candidats: Candidat[]; minutes: number | null }[];
  consommations: Consommation[];
}

interface Contexte {
  options: OptionsLancement;
  entrees: FichierEntrees;
  codePays: string;
  chapitres: { code: string; titre: string; sousThemes: string[] }[];
}

function promptProfesseur(c: Contexte): string {
  return composerPrompt(
    {
      agent: "professeur",
      codePays: c.codePays,
      unite: c.entrees.unite,
      skills: SKILLS.professeur,
      // En test, tous les chapitres du programme sont considérés comme validés.
      valeursDynamiques: {
        LISTE_CHAPITRES: c.chapitres.map((x) => x.titre).join(" ; "),
        CHAPITRE_EN_COURS: "en cours (voir le contexte de la session)",
      },
    },
    c.options.racine,
  );
}

/** Remplit r au fil de l'exécution : la transcription partielle reste disponible en cas d'erreur. */
async function executerProfesseur(
  c: Contexte,
  entree: EntreeScenario,
  r: ResultatExecution,
): Promise<void> {
  const systeme = promptProfesseur(c);
  const codeChapitre = entree.chapitre ?? c.entrees.chapitre_par_defaut;
  const titreChapitre = c.chapitres.find((x) => x.code === codeChapitre)?.titre ?? codeChapitre;
  const historique: BetaMessageParam[] = [];
  const lignes: string[] = [];
  try {
    for (const tour of entree.tours ?? []) {
      const sortie = await repondre({
        systeme,
        contexteSession: `# CONTEXTE DE LA SESSION\nChapitre en cours : « ${titreChapitre} ».`,
        historique,
        question: tour,
        modele: c.options.modele,
        parametres: c.options.parametres,
        // Aucune écriture réelle : les appels d'outils sont seulement enregistrés.
        executerOutil: async (appel) => {
          r.appels.push(appel);
          return appel.nom === "signaler"
            ? "Signalement transmis à un humain."
            : "Progression enregistrée.";
        },
        emettre: () => undefined,
      });
      r.consommations.push(...sortie.consommations);
      r.reponses.push(sortie.texte);
      lignes.push(`Élève : ${tour}`);
      for (const appel of sortie.appels)
        lignes.push(`[outil ${appel.nom} ${JSON.stringify({ ...appel, nom: undefined })}]`);
      lignes.push(
        `Professeur : ${sortie.texte || "(aucun texte)"}${sortie.arret !== "fin" ? ` [arrêt : ${sortie.arret}]` : ""}`,
      );
      historique.push({ role: "user", content: tour });
      if (sortie.texte.trim()) historique.push({ role: "assistant", content: sortie.texte });
    }
  } finally {
    r.transcription = lignes.join("\n");
  }
}

/** Remplit r au fil de l'exécution : la transcription partielle reste disponible en cas d'erreur. */
async function executerScenariste(
  c: Contexte,
  entree: EntreeScenario,
  r: ResultatExecution,
): Promise<void> {
  const lignes: string[] = [];
  try {
    for (const g of entree.generations ?? [{}]) {
      const duree = g.duree ?? c.entrees.duree_par_defaut ?? 10;
      const systeme = composerPrompt(
        {
          agent: "scenariste",
          codePays: c.codePays,
          unite: c.entrees.unite,
          skills: SKILLS.scenariste,
          valeursDynamiques: { DUREE: `${duree} minutes`, ...g.valeurs },
        },
        c.options.racine,
      );
      const code = g.chapitre ?? c.entrees.chapitre_par_defaut;
      const duPack = c.chapitres.find((x) => x.code === code);
      const titre = g.chapitre_hors_programme ?? g.chapitre_ajoute ?? duPack?.titre ?? code;
      // En test, tous les chapitres du programme sont considérés comme validés.
      const programme = [
        ...c.chapitres.map((x) => x.titre),
        ...(g.chapitre_ajoute ? [g.chapitre_ajoute] : []),
      ];
      const demande = {
        programmeValide: programme,
        chapitre: { titre, sousThemes: g.sous_themes ?? duPack?.sousThemes ?? [] },
        prerequis: [],
        dureeMinutes: duree,
        consigne: g.consigne,
      };
      const resultat = await genererScript({
        systeme,
        demande,
        modele: c.options.modele,
        parametres: c.options.parametres,
      });
      r.consommations.push(...resultat.consommations);
      if (g.valeurs) lignes.push(`[Valeurs de test : ${JSON.stringify(g.valeurs)}]`);
      lignes.push(messageDemande(demande), "", "--- Sortie du Scénariste ---");
      if (resultat.sortie) {
        const texte = scriptEnTexte(resultat.sortie);
        lignes.push(texte);
        r.reponses.push(JSON.stringify(resultat.sortie));
        r.sorties.push({ sortie: resultat.sortie as SortieScenariste, dureeMinutes: duree });
      } else {
        lignes.push(`(aucune sortie exploitable, arrêt : ${resultat.arret})`);
        r.sorties.push({ sortie: null, dureeMinutes: duree });
      }
      lignes.push("");
    }
  } finally {
    r.transcription = lignes.join("\n");
  }
}

/** Question complète à partir des champs donnés dans les entrées de test. */
function questionDeTest(q: CorrectionTest["question"], chapitre: string): Question {
  return {
    type: "reponse_courte",
    options: [],
    bonne_reponse: -1,
    notion: "",
    chapitre,
    difficulte: "moyen",
    guide_reponses: [],
    erreurs_deduites: [],
    verification: "",
    ...q,
  };
}

async function executerEvaluateur(
  c: Contexte,
  entree: EntreeScenario,
  r: ResultatExecution,
): Promise<void> {
  const lignes: string[] = [];
  const systeme = composerPrompt(
    {
      agent: "evaluateur",
      codePays: c.codePays,
      unite: c.entrees.unite,
      skills: SKILLS.evaluateur,
      valeursDynamiques: {},
    },
    c.options.racine,
  );
  const programme = c.chapitres.map((x) => x.titre);
  try {
    for (const d of entree.quiz ?? []) {
      const code = d.chapitre ?? c.entrees.chapitre_par_defaut;
      const duPack = c.chapitres.find((x) => x.code === code);
      const demande = {
        programmeValide: programme,
        chapitre: {
          titre: d.chapitre_hors_programme ?? duPack?.titre ?? code,
          sousThemes: duPack?.sousThemes ?? [],
        },
        prerequis: [],
        nombreQuestions: d.nombre ?? 5,
        difficulte: d.difficulte ?? "variee",
        consigne: d.consigne,
      };
      const resultat = await genererQuiz({
        systeme,
        demande,
        modele: c.options.modele,
        parametres: c.options.parametres,
      });
      r.consommations.push(...resultat.consommations);
      lignes.push(messageDemandeQuiz(demande), "", "--- Sortie de l'Évaluateur ---");
      lignes.push(
        resultat.sortie
          ? quizEnTexte(resultat.sortie)
          : `(aucune sortie exploitable, arrêt : ${resultat.arret})`,
        "",
      );
      if (resultat.sortie) r.reponses.push(JSON.stringify(resultat.sortie));
      r.quiz.push(resultat.sortie);
    }
    const titre =
      c.chapitres.find((x) => x.code === c.entrees.chapitre_par_defaut)?.titre ??
      c.entrees.chapitre_par_defaut;
    for (const t of entree.corrections ?? []) {
      const question = questionDeTest(t.question, titre);
      const contestation = t.contestation && {
        correction: {
          resultat: t.contestation.resultat,
          ce_qui_est_juste: "",
          erreur: "Réponse différente de la réponse attendue.",
          notion_a_revoir: question.notion,
          conseil: "",
          message_a_l_eleve: "",
          signalement: "aucun" as const,
          motif_signalement: "",
        },
        messages: t.contestation.messages,
      };
      const demande = { question, reponseEleve: t.reponse, contestation };
      const resultat = await corrigerReponse({
        systeme,
        demande,
        modele: c.options.modele,
        parametres: c.options.parametres,
      });
      r.consommations.push(...resultat.consommations);
      lignes.push(messageCorrection(demande), "", "--- Correction de l'Évaluateur ---");
      lignes.push(
        resultat.sortie
          ? JSON.stringify(resultat.sortie, null, 2)
          : `(aucune sortie exploitable, arrêt : ${resultat.arret})`,
        "",
      );
      if (resultat.sortie) r.reponses.push(JSON.stringify(resultat.sortie));
      r.corrections.push(resultat.sortie);
    }
  } finally {
    r.transcription = lignes.join("\n");
  }
}

async function executerTuteur(
  c: Contexte,
  entree: EntreeScenario,
  r: ResultatExecution,
): Promise<void> {
  const lignes: string[] = [];
  try {
    const p: ParcoursTest = { ...c.entrees.parcours_par_defaut, ...entree.parcours };
    const chapitres: ChapitreParcours[] = (p.chapitres ?? []).map((x, i) => ({
      id: x.titre,
      titre: x.titre,
      unite: x.unite ?? c.entrees.unite,
      ordre: i + 1,
      deSaClasse: !x.classe_inferieure,
      statut: x.statut ?? null,
      score: x.score ?? null,
    }));
    const candidats = candidatsDeRevision(
      chapitres,
      (p.prerequis ?? []).map(([chapitreId, prerequisId]) => ({ chapitreId, prerequisId })),
    );
    const demande = {
      candidats,
      preferences: { minutesParJour: p.minutes ?? null, connexion: p.connexion ?? null },
      joursSansActivite: p.jours_sans_activite ?? 0,
      examen: null,
      message: p.message,
    };
    const resultat = await genererPlan({
      systeme: composerPrompt(
        {
          agent: "tuteur",
          codePays: c.codePays,
          unite: "pays",
          skills: SKILLS.tuteur,
          valeursDynamiques: {},
        },
        c.options.racine,
      ),
      demande,
      modele: c.options.modele,
      parametres: c.options.parametres,
    });
    r.consommations.push(...resultat.consommations);
    lignes.push(messageDemandePlan(demande), "", "--- Plan du Tuteur ---");
    if (resultat.sortie) {
      const plan = resultat.sortie;
      lignes.push(
        ...plan.priorites.map(
          (x, i) =>
            `${i + 1}. ${candidats[x.candidat]?.titre ?? `(candidat inconnu ${x.candidat})`} — ${x.minutes} min : ${x.raison}`,
        ),
        `Message à l'élève : ${plan.message_eleve}`,
        `Rythme : ${plan.conseil_rythme}`,
        `Signalement : ${plan.signalement}${plan.motif_signalement ? ` (${plan.motif_signalement})` : ""}`,
      );
      r.reponses.push(JSON.stringify(plan));
    } else lignes.push(`(aucune sortie exploitable, arrêt : ${resultat.arret})`);
    r.plans.push({ plan: resultat.sortie, candidats, minutes: p.minutes ?? null });
  } finally {
    r.transcription = lignes.join("\n");
  }
}

const EXECUTANTS = {
  tuteur: executerTuteur,
  professeur: executerProfesseur,
  scenariste: executerScenariste,
  evaluateur: executerEvaluateur,
};

export async function lancer(options: OptionsLancement): Promise<Rapport> {
  const journal = options.journal ?? (() => undefined);
  const aleatoire = options.aleatoire ?? Math.random;
  const entrees = chargerEntrees(options.racine, options.agent);
  const codePays = entrees.unite.split("-")[0];
  const pack = lirePack(dossierPack(options.racine, codePays));
  const contexte: Contexte = {
    options,
    entrees,
    codePays,
    chapitres: pack.programmes[entrees.unite] ?? [],
  };
  const nonApplicables = entrees.non_applicables ?? {};

  const toutes = chargerBatteries(options.racine, options.agent);
  const choisies = toutes.filter((s) => !options.ids || options.ids.includes(s.id));
  const nonConvertis = choisies
    .filter((s) => !entrees.scenarios[s.id] && !nonApplicables[s.id])
    .map((s) => s.id);
  const consommationsAgent: Consommation[] = [];
  const consommationsJuge: Consommation[] = [];
  const resultats: ResultatScenario[] = [];

  for (const scenario of choisies.filter((s) => entrees.scenarios[s.id])) {
    const entree = entrees.scenarios[scenario.id];
    const verifications = fusionner(entrees.verifications_communes, entree.verifications);
    const executions: Execution[] = [];

    for (let numero = 1; numero <= options.executions; numero++) {
      const partiel: ResultatExecution = {
        transcription: "",
        reponses: [],
        appels: [],
        sorties: [],
        quiz: [],
        corrections: [],
        plans: [],
        consommations: [],
      };
      try {
        await EXECUTANTS[options.agent](contexte, entree, partiel);
        const controlesEchoues = [
          ...controler(verifications, partiel.reponses, partiel.appels, partiel.sorties),
          ...(options.agent === "evaluateur"
            ? controlerEvaluateur(verifications, partiel.quiz, partiel.corrections)
            : []),
          ...(options.agent === "tuteur" ? controlerTuteur(verifications, partiel.plans) : []),
        ];
        const jugement = await options.juge(scenario, partiel.transcription, options.agent);
        if (jugement.consommation) consommationsJuge.push(jugement.consommation);
        executions.push({
          numero,
          transcription: partiel.transcription,
          controlesEchoues,
          verdict:
            controlesEchoues.length === 0 && jugement.verdict === "reussi" ? "reussi" : "echec",
          justification: jugement.justification,
        });
      } catch (erreur) {
        executions.push({
          numero,
          transcription: partiel.transcription,
          controlesEchoues: [],
          verdict: "erreur",
          justification: `Erreur d'exécution : ${(erreur as Error).name}`,
        });
      }
      consommationsAgent.push(...partiel.consommations);
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
    nonApplicables,
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
  const nonApplicables = Object.entries(r.nonApplicables ?? {});
  if (nonApplicables.length > 0) {
    lignes.push(
      "Scénarios non applicables à cet agent :",
      ...nonApplicables.map(([id, raison]) => `- ${id} : ${raison}`),
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
