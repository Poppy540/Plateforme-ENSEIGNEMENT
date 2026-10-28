// Rapport hebdomadaire agrégé du pilote (Jalon 13, étape 3 ; ADR 0082). Il répond aux 5 questions du protocole de
// retour d'expérience (docs/pilote/retour-experience.md), avec la semaine précédente en regard. Deux versions :
// « equipe » (complète) et « etablissement » (sans coûts, sans détail des agents, sans charge de l'équipe, sans
// critères ni journal). Seuil de diffusion : aucun effectif de personnes de 1 à 4 (« <5 »), pas de moyenne sous 5
// quiz, pas de coût par élève sous 5 élèves actifs. Fonctions pures : la page, l'export et les tests s'en servent.
import { SEUIL_DIFFUSION, effectif } from "@/lib/exploitation/indicateurs";
import type { CritereEvalue } from "./criteres";

export type Version = "equipe" | "etablissement";

export interface ChiffresSemaine {
  debut: string;
  fin: string;
  eleves_inscrits: number;
  eleves_actifs: number;
  chapitres_termines: number;
  videos_demarrees: number;
  videos_terminees: number;
  lecons_ouvertes: number;
  questions: number;
  quiz: number;
  score_moyen: number | null;
  contestations: number;
  reponses_questionnaire: number;
  signalements: number;
  detresses: number;
  hors_programme: number;
  contenus_inappropries: number;
  erreurs_contenu: number;
  demandes_reponses: number;
  signalements_traites: number;
  signalements_ouverts: number;
  delai_median_heures: number | null;
  tickets: number;
  tickets_resolus: number;
  chapitres_valides: number;
  cout_usd: number;
}

export interface EntreeJournalSemaine {
  type: string;
  agent: string | null;
  texte: string;
  cree_le: string;
}

export interface Ligne {
  libelle: string;
  semaine: string;
  precedente: string;
}

export interface Section {
  titre: string;
  lignes: Ligne[];
}

export interface RapportSemaine {
  version: Version;
  debut: string;
  fin: string;
  sections: Section[];
  /** Équipe seulement : critères qui ne sont pas calmes, et décisions de la semaine. */
  criteres: { titre: string; etat: string; detail: string }[];
  journal: EntreeJournalSemaine[];
}

const moyenne = (c: ChiffresSemaine) =>
  c.quiz >= SEUIL_DIFFUSION && c.score_moyen !== null
    ? `${Number(c.score_moyen).toFixed(1)} / 100`
    : "—";
const usd = (n: number) => `${Number(n).toFixed(2)} USD`;
const coutParEleve = (c: ChiffresSemaine) =>
  c.eleves_actifs >= SEUIL_DIFFUSION ? usd(c.cout_usd / c.eleves_actifs) : "—";
const heures = (n: number | null) => (n === null ? "—" : `${Number(n).toFixed(1)} h`);

export type Calcul = (c: ChiffresSemaine) => string;
const brut =
  (cle: keyof ChiffresSemaine): Calcul =>
  (c) =>
    String(c[cle]);
const personnes =
  (cle: keyof ChiffresSemaine): Calcul =>
  (c) =>
    effectif(Number(c[cle]));

export interface DefinitionSection {
  titre: string;
  lignes: [string, Calcul][];
}

/**
 * Indicateurs du rapport, par question du retour d'expérience, selon la version : repris tels quels par le rapport
 * de la semaine et par le rapport de fin de pilote (ADR 0084). « periode » ne change que le libellé des actifs.
 */
export function indicateurs(version: Version, periode: "semaine" | "pilote"): DefinitionSection[] {
  const definitions: DefinitionSection[] = [
    {
      titre: "1. Les élèves utilisent-ils la plateforme ?",
      lignes: [
        ["Élèves inscrits (accord du parent reçu)", personnes("eleves_inscrits")],
        [
          periode === "semaine" ? "Élèves actifs dans la semaine" : "Élèves actifs sur la période",
          personnes("eleves_actifs"),
        ],
        ["Chapitres terminés", brut("chapitres_termines")],
        ["Vidéos démarrées", brut("videos_demarrees")],
        ["Vidéos vues jusqu'au bout", brut("videos_terminees")],
        ["Leçons écrites ouvertes", brut("lecons_ouvertes")],
      ],
    },
    {
      titre: "2. Les contenus aident-ils à comprendre ?",
      lignes: [
        ["Questions posées au professeur", brut("questions")],
        ["Quiz passés", brut("quiz")],
        ["Score moyen aux quiz (dès 5 quiz)", moyenne],
        ["Réponses au questionnaire anonyme", brut("reponses_questionnaire")],
      ],
    },
  ];
  if (version === "etablissement")
    return [
      ...definitions,
      {
        titre: "3. Signalements",
        lignes: [
          ["Signalements reçus", brut("signalements")],
          ["Signalements traités par l'équipe", brut("signalements_traites")],
        ],
      },
    ];
  return [
    ...definitions,
    {
      titre: "3. Les agents restent-ils dans leur rôle ?",
      lignes: [
        ["Signalements reçus", brut("signalements")],
        ["dont détresses", personnes("detresses")],
        ["dont hors programme", brut("hors_programme")],
        ["dont contenus inappropriés", brut("contenus_inappropries")],
        ["dont erreurs de contenu", brut("erreurs_contenu")],
        ["dont demandes de réponses", brut("demandes_reponses")],
        ["Contestations de corrections de quiz", brut("contestations")],
      ],
    },
    {
      titre: "4. L'équipe tient-elle la charge ?",
      lignes: [
        ["Signalements traités", brut("signalements_traites")],
        ["Signalements encore ouverts en fin de période", brut("signalements_ouverts")],
        ["Délai médian de traitement", (c) => heures(c.delai_median_heures)],
        ["Tickets du Support reçus", brut("tickets")],
        ["Tickets résolus", brut("tickets_resolus")],
        ["Chapitres validés par le référent", brut("chapitres_valides")],
      ],
    },
    {
      titre: "5. Le coût est-il soutenable ?",
      lignes: [
        ["Coût des agents", (c) => usd(c.cout_usd)],
        ["Coût par élève actif (dès 5 élèves)", coutParEleve],
      ],
    },
  ];
}

const ETATS: Record<string, string> = {
  a_examiner: "À examiner",
  atteint: "Atteint",
  non_surveille: "Non surveillé",
};

export function rapportSemaine(
  version: Version,
  semaine: ChiffresSemaine,
  precedente: ChiffresSemaine,
  criteres: readonly CritereEvalue[] = [],
  journal: readonly EntreeJournalSemaine[] = [],
): RapportSemaine {
  const s = semaine;
  const p = precedente;
  const sections: Section[] = indicateurs(version, "semaine").map((d) => ({
    titre: d.titre,
    lignes: d.lignes.map(([libelle, f]) => ({ libelle, semaine: f(s), precedente: f(p) })),
  }));
  return {
    version,
    debut: s.debut,
    fin: s.fin,
    sections,
    criteres:
      version === "equipe"
        ? criteres
            .filter((c) => c.etat !== "rien_a_signaler")
            .map((c) => ({ titre: c.titre, etat: ETATS[c.etat] ?? c.etat, detail: c.detail }))
        : [],
    journal: version === "equipe" ? [...journal] : [],
  };
}

const TYPES_JOURNAL: Record<string, string> = {
  suspension_agent: "Suspension d'un agent",
  reprise_agent: "Reprise d'un agent",
  fermeture_acces: "Fermeture de l'accès des élèves",
  reprise_acces: "Réouverture de l'accès des élèves",
  point_hebdomadaire: "Point hebdomadaire",
  note: "Note",
};

export function libelleJournal(type: string): string {
  return TYPES_JOURNAL[type] ?? type;
}

const date = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-");
  return `${j}/${m}/${a}`;
};
const cellule = (t: string) => t.replace(/\|/g, "\\|").replace(/\s+/g, " ");

/** Version texte (Markdown) pour le point hebdomadaire ou pour l'établissement. */
export function rapportMarkdown(r: RapportSemaine): string {
  const lignes = [
    `# Semaine du pilote, du ${date(r.debut)} au ${date(r.fin)}`,
    "",
    r.version === "equipe"
      ? "Version **équipe** : chiffres agrégés, aucune donnée individuelle. À ne pas diffuser hors de l'équipe."
      : "Version **établissement** : chiffres agrégés, aucune donnée individuelle.",
    `Aucun effectif de moins de ${SEUIL_DIFFUSION} personnes n'est donné (« <${SEUIL_DIFFUSION} »).`,
    "",
  ];
  for (const s of r.sections) {
    lignes.push(`## ${s.titre}`, "", "| | Semaine | Semaine précédente |", "|---|---|---|");
    for (const l of s.lignes)
      lignes.push(`| ${cellule(l.libelle)} | ${l.semaine} | ${l.precedente} |`);
    lignes.push("");
  }
  if (r.version === "equipe") {
    lignes.push("## Critères de suspension", "");
    if (r.criteres.length === 0) lignes.push("Aucun critère atteint ni à examiner.");
    for (const c of r.criteres)
      lignes.push(`- **${c.etat}** : ${cellule(c.titre)}. ${cellule(c.detail)}`);
    lignes.push("", "## Décisions de la semaine (journal du pilote)", "");
    if (r.journal.length === 0) lignes.push("Aucune décision notée.");
    for (const e of r.journal)
      lignes.push(
        `- ${date(e.cree_le)} — ${libelleJournal(e.type)}${e.agent ? ` (${e.agent})` : ""} : ${cellule(e.texte)}`,
      );
    lignes.push("");
  }
  return lignes.join("\n");
}
