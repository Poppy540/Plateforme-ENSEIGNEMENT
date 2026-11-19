import { describe, expect, it } from "vitest";
import type { CritereEvalue } from "./criteres";
import { rapportMarkdown, rapportSemaine, type ChiffresSemaine } from "./semaine";

const SEMAINE: ChiffresSemaine = {
  debut: "2026-10-22",
  fin: "2026-10-28",
  eleves_inscrits: 28,
  eleves_actifs: 21,
  chapitres_termines: 40,
  videos_demarrees: 60,
  videos_terminees: 44,
  lecons_ouvertes: 30,
  questions: 150,
  quiz: 35,
  score_moyen: 71.43,
  contestations: 3,
  reponses_questionnaire: 12,
  signalements: 6,
  detresses: 1,
  hors_programme: 2,
  contenus_inappropries: 0,
  erreurs_contenu: 1,
  demandes_reponses: 2,
  signalements_traites: 5,
  signalements_ouverts: 1,
  delai_median_heures: 3.25,
  tickets: 4,
  tickets_resolus: 3,
  chapitres_valides: 2,
  cout_usd: 10.5,
};
const PRECEDENTE: ChiffresSemaine = {
  ...SEMAINE,
  debut: "2026-10-15",
  fin: "2026-10-21",
  eleves_actifs: 3,
  quiz: 4,
  detresses: 0,
  delai_median_heures: null,
};
const toutes = (r: ReturnType<typeof rapportSemaine>) =>
  r.sections.flatMap((s) => s.lignes.map((l) => [l.libelle, l.semaine, l.precedente]));

describe("rapport de la semaine du pilote (ADR 0082)", () => {
  it("version équipe : les 5 questions, semaine et précédente, petits effectifs masqués", () => {
    const r = rapportSemaine("equipe", SEMAINE, PRECEDENTE);
    expect(r.sections.map((s) => s.titre.slice(0, 2))).toEqual(["1.", "2.", "3.", "4.", "5."]);
    const lignes = toutes(r);
    expect(lignes).toContainEqual(["Élèves actifs dans la semaine", "21", "<5"]);
    expect(lignes).toContainEqual(["dont détresses", "<5", "0"]);
    expect(lignes).toContainEqual(["Score moyen aux quiz (dès 5 quiz)", "71.4 / 100", "—"]);
    expect(lignes).toContainEqual(["Coût par élève actif (dès 5 élèves)", "0.50 USD", "—"]);
    expect(lignes).toContainEqual(["Délai médian de traitement", "3.3 h", "—"]);
  });

  it("version établissement : ni coût, ni détail des agents, ni charge de l'équipe, ni critères, ni journal", () => {
    const r = rapportSemaine(
      "etablissement",
      SEMAINE,
      PRECEDENTE,
      [
        {
          code: "x",
          titre: "Critère fictif",
          etat: "atteint",
          detail: "d",
        } as unknown as CritereEvalue,
      ],
      [{ type: "note", agent: null, texte: "Note fictive", cree_le: "2026-10-27T10:00:00Z" }],
    );
    const texte = JSON.stringify(r) + rapportMarkdown(r);
    expect(texte).not.toMatch(
      /USD|Coût|détresse|hors programme|Délai|Tickets|Critère fictif|Note fictive/i,
    );
    expect(r.sections.map((s) => s.titre)).toEqual([
      "1. Les élèves utilisent-ils la plateforme ?",
      "2. Les contenus aident-ils à comprendre ?",
      "3. Signalements",
    ]);
  });

  it("texte Markdown : tableaux, critères non calmes et décisions de la semaine (équipe)", () => {
    const r = rapportSemaine(
      "equipe",
      SEMAINE,
      PRECEDENTE,
      [
        { titre: "Critère calme", etat: "rien_a_signaler", detail: "ok" },
        {
          titre: "Détresse non prise en charge dans le délai",
          etat: "a_examiner",
          detail: "1 détresse.",
        },
      ] as unknown as CritereEvalue[],
      [
        {
          type: "suspension_agent",
          agent: "tuteur",
          texte: "Motif | fictif",
          cree_le: "2026-10-27T10:00:00Z",
        },
      ],
    );
    const md = rapportMarkdown(r);
    expect(md).toContain("# Semaine du pilote, du 22/10/2026 au 28/10/2026");
    expect(md).toContain("| Élèves actifs dans la semaine | 21 | <5 |");
    expect(md).toContain(
      "- **À examiner** : Détresse non prise en charge dans le délai. 1 détresse.",
    );
    expect(md).not.toContain("Critère calme");
    expect(md).toContain("- 27/10/2026 — Suspension d'un agent (tuteur) : Motif \\| fictif");
  });
});
