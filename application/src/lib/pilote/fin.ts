// Rapport de fin de pilote (Jalon 14, étape 1 ; ADR 0084) : les 5 questions du retour d'expérience sur toute la
// période du pilote, avec le total et une colonne par semaine ; mêmes indicateurs et mêmes règles de diffusion que
// le rapport de la semaine (ADR 0082). Version équipe : critères atteints pendant le pilote et décisions du journal ;
// version établissement : ni coûts, ni détail des agents, ni critères, ni journal. Le questionnaire anonyme figure
// dans les deux, groupe par groupe, dès 5 réponses. Fonctions pures : la page, l'export et les tests s'en servent.
import { resultatsDiffusables, type LigneResultat } from "@/lib/exploitation/mesures";
import {
  indicateurs,
  libelleJournal,
  type ChiffresSemaine,
  type EntreeJournalSemaine,
  type Version,
} from "./semaine";

export interface Intervalle {
  debut: string;
  fin: string;
}

export interface AlerteCritere {
  cree_le: string;
  priorite: number;
  resume: string;
}

export interface QuestionResultat {
  public: string;
  texte: string;
  total: string;
  options: { option: string; nombre: string }[];
}

export interface RapportFin {
  version: Version;
  debut: string;
  fin: string;
  enCours: boolean;
  /** « Total », puis une colonne par semaine (« Sem. 1 »…), avec ses dates dans « semaines ». */
  colonnes: string[];
  semaines: Intervalle[];
  sections: { titre: string; lignes: { libelle: string; valeurs: string[] }[] }[];
  questionnaire: QuestionResultat[];
  alertes: AlerteCritere[];
  journal: EntreeJournalSemaine[];
}

const JOUR_MS = 86_400_000;
const versDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const versIso = (d: Date) => d.toISOString().slice(0, 10);

/** Découpe la période en semaines de 7 jours à partir du début ; la dernière s'arrête à la fin (53 au plus). */
export function decouperEnSemaines(debut: string, fin: string): Intervalle[] {
  const semaines: Intervalle[] = [];
  for (let d = versDate(debut); d <= versDate(fin) && semaines.length < 53;) {
    const f = new Date(Math.min(d.getTime() + 6 * JOUR_MS, versDate(fin).getTime()));
    semaines.push({ debut: versIso(d), fin: versIso(f) });
    d = new Date(f.getTime() + JOUR_MS);
  }
  return semaines;
}

/** Questionnaire anonyme : groupes de moins de 5 réponses retirés, cases de 1 à 4 masquées (ADR 0052). */
function questionnaireDiffusable(lignes: LigneResultat[]): QuestionResultat[] {
  const questions = new Map<string, QuestionResultat>();
  for (const l of resultatsDiffusables(lignes)) {
    const cle = `${l.referentiel}|${l.version}|${l.public}|${l.question}`;
    if (!questions.has(cle))
      questions.set(cle, { public: l.public, texte: l.texte, total: l.total, options: [] });
    questions.get(cle)!.options.push({ option: l.option, nombre: l.nombre });
  }
  return [...questions.values()];
}

export function rapportFin(
  version: Version,
  periode: Intervalle & { enCours: boolean },
  total: ChiffresSemaine,
  semaines: readonly ChiffresSemaine[],
  questionnaire: LigneResultat[] = [],
  alertes: readonly AlerteCritere[] = [],
  journal: readonly EntreeJournalSemaine[] = [],
): RapportFin {
  return {
    version,
    debut: periode.debut,
    fin: periode.fin,
    enCours: periode.enCours,
    colonnes: ["Total", ...semaines.map((_, i) => `Sem. ${i + 1}`)],
    semaines: semaines.map((s) => ({ debut: s.debut, fin: s.fin })),
    sections: indicateurs(version, "pilote").map((d) => ({
      titre: d.titre,
      lignes: d.lignes.map(([libelle, f]) => ({
        libelle,
        valeurs: [f(total), ...semaines.map((s) => f(s))],
      })),
    })),
    questionnaire: questionnaireDiffusable(questionnaire),
    alertes: version === "equipe" ? [...alertes] : [],
    journal: version === "equipe" ? [...journal] : [],
  };
}

const date = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-");
  return `${j}/${m}/${a}`;
};
const cellule = (t: string) => t.replace(/\|/g, "\\|").replace(/\s+/g, " ");
const PUBLICS: Record<string, string> = { eleve: "élèves", parent: "parents" };

/** Version texte (Markdown) : base du rapport de pilote de docs/bilans/ et de la réunion de bilan. */
export function rapportFinMarkdown(r: RapportFin): string {
  const lignes = [
    `# Rapport de fin de pilote, du ${date(r.debut)} au ${date(r.fin)}${r.enCours ? " (pilote en cours)" : ""}`,
    "",
    r.version === "equipe"
      ? "Version **équipe** : chiffres agrégés, aucune donnée individuelle. À ne pas diffuser hors de l'équipe."
      : "Version **établissement** : chiffres agrégés, aucune donnée individuelle.",
    "Aucun effectif de moins de 5 personnes n'est donné (« <5 »).",
    "",
    "Semaines : " +
      r.semaines.map((s, i) => `Sem. ${i + 1} du ${date(s.debut)} au ${date(s.fin)}`).join(" ; ") +
      ".",
    "",
  ];
  for (const s of r.sections) {
    lignes.push(
      `## ${s.titre}`,
      "",
      `| | ${r.colonnes.join(" | ")} |`,
      `|---|${r.colonnes.map(() => "---").join("|")}|`,
    );
    for (const l of s.lignes) lignes.push(`| ${cellule(l.libelle)} | ${l.valeurs.join(" | ")} |`);
    lignes.push("");
  }
  lignes.push("## Questionnaire anonyme", "");
  if (r.questionnaire.length === 0) lignes.push("Moins de 5 réponses par groupe : rien à montrer.");
  for (const q of r.questionnaire)
    lignes.push(
      `- ${cellule(q.texte)} (${PUBLICS[q.public] ?? q.public}, ${q.total} réponses) : ` +
        q.options.map((o) => `${cellule(o.option)} ${o.nombre}`).join(" ; "),
    );
  lignes.push("");
  if (r.version === "equipe") {
    lignes.push("## Critères de suspension signalés pendant le pilote", "");
    if (r.alertes.length === 0) lignes.push("Aucun.");
    for (const a of r.alertes)
      lignes.push(
        `- ${date(a.cree_le)} — priorité ${a.priorite} : ${cellule(a.resume.replace(/^Critère de suspension du pilote : /, ""))}`,
      );
    lignes.push("", "## Décisions (journal du pilote)", "");
    if (r.journal.length === 0) lignes.push("Aucune décision notée.");
    for (const e of r.journal)
      lignes.push(
        `- ${date(e.cree_le)} — ${libelleJournal(e.type)}${e.agent ? ` (${e.agent})` : ""} : ${cellule(e.texte)}`,
      );
    lignes.push("");
  }
  return lignes.join("\n");
}
