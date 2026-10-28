import { describe, expect, it } from "vitest";
import type { LigneResultat } from "@/lib/exploitation/mesures";
import { decouperEnSemaines, rapportFin, rapportFinMarkdown } from "./fin";
import type { ChiffresSemaine } from "./semaine";

const chiffres = (debut: string, fin: string, actifs: number, cout: number): ChiffresSemaine => ({
  debut,
  fin,
  eleves_inscrits: 28,
  eleves_actifs: actifs,
  chapitres_termines: 10,
  videos_demarrees: 20,
  videos_terminees: 15,
  lecons_ouvertes: 8,
  questions: 40,
  quiz: actifs,
  score_moyen: 70,
  contestations: 1,
  reponses_questionnaire: 6,
  signalements: 2,
  detresses: 1,
  hors_programme: 0,
  contenus_inappropries: 0,
  erreurs_contenu: 1,
  demandes_reponses: 0,
  signalements_traites: 2,
  signalements_ouverts: 0,
  delai_median_heures: 2,
  tickets: 1,
  tickets_resolus: 1,
  chapitres_valides: 1,
  cout_usd: cout,
});
const PERIODE = { debut: "2026-10-01", fin: "2026-10-14", enCours: false };
const TOTAL = chiffres("2026-10-01", "2026-10-14", 25, 9);
const SEMAINES = [
  chiffres("2026-10-01", "2026-10-07", 22, 4),
  chiffres("2026-10-08", "2026-10-14", 3, 5),
];
const reponse = (option: string, nombre: number, total: number): LigneResultat => ({
  referentiel: "ga-general",
  version: "1",
  public: "eleve",
  question: "q1",
  texte: "La plateforme t'aide-t-elle ?",
  option,
  nombre,
  total,
});

describe("rapport de fin de pilote (ADR 0084)", () => {
  it("découpe la période en semaines de 7 jours ; la dernière s'arrête à la fin", () => {
    expect(decouperEnSemaines("2026-10-01", "2026-10-28")).toHaveLength(4);
    expect(decouperEnSemaines("2026-10-01", "2026-10-10")).toEqual([
      { debut: "2026-10-01", fin: "2026-10-07" },
      { debut: "2026-10-08", fin: "2026-10-10" },
    ]);
    expect(decouperEnSemaines("2026-10-01", "2026-10-01")).toEqual([
      { debut: "2026-10-01", fin: "2026-10-01" },
    ]);
    expect(decouperEnSemaines("2026-01-01", "2027-01-02")).toHaveLength(53);
  });

  it("version équipe : total puis une colonne par semaine, petits effectifs masqués", () => {
    const r = rapportFin("equipe", PERIODE, TOTAL, SEMAINES);
    expect(r.colonnes).toEqual(["Total", "Sem. 1", "Sem. 2"]);
    expect(r.sections).toHaveLength(5);
    const actifs = r.sections[0].lignes.find((l) => l.libelle === "Élèves actifs sur la période")!;
    expect(actifs.valeurs).toEqual(["25", "22", "<5"]);
    const moyenne = r.sections[1].lignes.find((l) => l.libelle.startsWith("Score moyen"))!;
    expect(moyenne.valeurs).toEqual(["70.0 / 100", "70.0 / 100", "—"]);
  });

  it("version établissement : ni coûts, ni détail des agents, ni alertes, ni journal", () => {
    const r = rapportFin(
      "etablissement",
      PERIODE,
      TOTAL,
      SEMAINES,
      [],
      [{ cree_le: "2026-10-05T10:00:00Z", priorite: 1, resume: "Critère fictif" }],
      [{ type: "note", agent: null, texte: "Note fictive", cree_le: "2026-10-05T10:00:00Z" }],
    );
    const texte = JSON.stringify(r) + rapportFinMarkdown(r);
    expect(texte).not.toMatch(/USD|Coût|détresse|Tickets|Critère fictif|Note fictive/i);
    expect(r.sections.map((s) => s.titre.slice(0, 2))).toEqual(["1.", "2.", "3."]);
  });

  it("questionnaire : groupe de moins de 5 réponses retiré, cases de 1 à 4 masquées", () => {
    const peu = rapportFin("equipe", PERIODE, TOTAL, SEMAINES, [
      reponse("Oui", 3, 4),
      reponse("Non", 1, 4),
    ]);
    expect(peu.questionnaire).toEqual([]);
    const assez = rapportFin("equipe", PERIODE, TOTAL, SEMAINES, [
      reponse("Oui", 9, 12),
      reponse("Non", 3, 12),
    ]);
    expect(assez.questionnaire).toEqual([
      {
        public: "eleve",
        texte: "La plateforme t'aide-t-elle ?",
        total: "12",
        options: [
          { option: "Oui", nombre: "9" },
          { option: "Non", nombre: "<5" },
        ],
      },
    ]);
  });

  it("texte Markdown : semaines datées, tableaux, alertes et décisions (équipe)", () => {
    const md = rapportFinMarkdown(
      rapportFin(
        "equipe",
        { ...PERIODE, enCours: true },
        TOTAL,
        SEMAINES,
        [],
        [
          {
            cree_le: "2026-10-05T10:00:00Z",
            priorite: 1,
            resume: "Critère de suspension du pilote : Détresse non prise en charge dans le délai.",
          },
        ],
        [
          {
            type: "point_hebdomadaire",
            agent: null,
            texte: "Point fictif",
            cree_le: "2026-10-07T10:00:00Z",
          },
        ],
      ),
    );
    expect(md).toContain(
      "# Rapport de fin de pilote, du 01/10/2026 au 14/10/2026 (pilote en cours)",
    );
    expect(md).toContain(
      "Sem. 1 du 01/10/2026 au 07/10/2026 ; Sem. 2 du 08/10/2026 au 14/10/2026.",
    );
    expect(md).toContain("| | Total | Sem. 1 | Sem. 2 |");
    expect(md).toContain("| Élèves actifs sur la période | 25 | 22 | <5 |");
    expect(md).toContain("- 05/10/2026 — priorité 1 : Détresse non prise en charge dans le délai.");
    expect(md).toContain("- 07/10/2026 — Point hebdomadaire : Point fictif");
  });
});
