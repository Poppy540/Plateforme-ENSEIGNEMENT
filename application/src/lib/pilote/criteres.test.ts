import { describe, expect, it } from "vitest";
import type { SeuilsPilote } from "@/lib/pack-pays/lecture";
import {
  CRITERES,
  alertesASignaler,
  evaluerCriteres,
  seuilsLesPlusPrudents,
  synthese,
  type FaitsCriteres,
} from "./criteres";

const SEUILS: SeuilsPilote = {
  detresse_delai_heures: 2,
  detresse_delai_max_heures: 12,
  erreur_contenu_delai_jours: 7,
  contestations_max_par_question: 2,
  depassement_budget_pourcent: 50,
  budget_hebdomadaire_usd: 20,
};
const AUCUN_SEUIL: SeuilsPilote = {
  detresse_delai_heures: null,
  detresse_delai_max_heures: null,
  erreur_contenu_delai_jours: null,
  contestations_max_par_question: null,
  depassement_budget_pourcent: null,
  budget_hebdomadaire_usd: null,
};
const CALME: FaitsCriteres = {
  detresses_hors_delai: 0,
  detresses_hors_delai_max: 0,
  erreurs_contenu_anciennes: 0,
  contestations_max_question: 1,
  cout_7_jours: 12.5,
  agents_suspendus: [],
  acces_eleves_ouvert: true,
};
const etat = (liste: ReturnType<typeof evaluerCriteres>, code: string) =>
  liste.find((c) => c.code === code)!;

describe("critères de suspension du pilote (ADR 0080)", () => {
  it("reprend les critères de criteres-arret.md, sans pays en dur, codes uniques", () => {
    expect(CRITERES).toHaveLength(12);
    expect(new Set(CRITERES.map((c) => c.code)).size).toBe(12);
    expect(JSON.stringify(CRITERES)).not.toMatch(/Gabon|ga-|3e/);
    expect(CRITERES.filter((c) => c.source === "calcule").map((c) => c.code)).toEqual([
      "detresse_hors_delai",
      "erreur_contenu_non_corrigee",
      "contestations_repetees",
      "depassement_budget",
    ]);
  });

  it("tout est calme : rien à signaler, aucune alerte", () => {
    const criteres = evaluerCriteres(CALME, SEUILS, []);
    expect(criteres.every((c) => c.etat === "rien_a_signaler")).toBe(true);
    expect(synthese(criteres)).toEqual({
      atteints: 0,
      aExaminer: 0,
      nonSurveilles: 0,
      arret: false,
    });
    expect(alertesASignaler(criteres)).toEqual([]);
  });

  it("détresse : à examiner au-delà du délai, atteint au-delà du délai maximal", () => {
    const examiner = evaluerCriteres({ ...CALME, detresses_hors_delai: 1 }, SEUILS, []);
    expect(etat(examiner, "detresse_hors_delai").etat).toBe("a_examiner");
    const atteint = evaluerCriteres(
      { ...CALME, detresses_hors_delai: 2, detresses_hors_delai_max: 1 },
      SEUILS,
      [],
    );
    expect(etat(atteint, "detresse_hors_delai")).toMatchObject({
      etat: "atteint",
      detail: "1 détresse sans prise en charge depuis plus de 12 h.",
    });
    expect(alertesASignaler(atteint)).toEqual([
      expect.objectContaining({ critere: "detresse_hors_delai_atteint", priorite: 1 }),
    ]);
  });

  it("erreurs de contenu, contestations et budget : à examiner au point de la semaine", () => {
    const criteres = evaluerCriteres(
      {
        ...CALME,
        erreurs_contenu_anciennes: 2,
        contestations_max_question: 3,
        cout_7_jours: 30.01,
      },
      SEUILS,
      [],
    );
    for (const code of [
      "erreur_contenu_non_corrigee",
      "contestations_repetees",
      "depassement_budget",
    ])
      expect(etat(criteres, code).etat).toBe("a_examiner");
    expect(etat(criteres, "depassement_budget").detail).toBe(
      "30.01 USD sur 7 jours, budget 20.00 USD : plus de 50 % au-delà.",
    );
    expect(alertesASignaler(criteres).every((a) => a.priorite === 2)).toBe(true);
    // Exactement au seuil : rien à signaler (« plus de 2 contestations », « plus de 50 % »).
    const auSeuil = evaluerCriteres(
      { ...CALME, contestations_max_question: 2, cout_7_jours: 30 },
      SEUILS,
      [],
    );
    expect(etat(auSeuil, "contestations_repetees").etat).toBe("rien_a_signaler");
    expect(etat(auSeuil, "depassement_budget").etat).toBe("rien_a_signaler");
  });

  it("seuil absent : critère non surveillé, et c'est dit", () => {
    const criteres = evaluerCriteres(
      {
        ...CALME,
        detresses_hors_delai: null,
        detresses_hors_delai_max: null,
        erreurs_contenu_anciennes: null,
      },
      AUCUN_SEUIL,
      [],
    );
    expect(synthese(criteres).nonSurveilles).toBe(4);
    expect(etat(criteres, "depassement_budget").detail).toMatch(/budget_hebdomadaire_usd à fixer/);
    expect(alertesASignaler(criteres)).toEqual([]);
  });

  it("critères déclarés : atteint (immédiat, arrêt) ou à examiner (semaine) ; jamais d'alerte automatique", () => {
    const criteres = evaluerCriteres(CALME, SEUILS, [
      { critere: "fuite_donnees", motif: "Essai fictif", declare_le: "2026-10-28 10:00:00+00" },
      {
        critere: "equipe_indisponible",
        motif: "Essai fictif",
        declare_le: "2026-10-28 10:00:00+00",
      },
      { critere: "retrait_accord", motif: "Essai fictif", declare_le: "2026-10-28 10:00:00+00" },
    ]);
    expect(etat(criteres, "fuite_donnees").etat).toBe("atteint");
    expect(etat(criteres, "equipe_indisponible").etat).toBe("a_examiner");
    expect(synthese(criteres)).toMatchObject({ atteints: 2, aExaminer: 1, arret: true });
    expect(alertesASignaler(criteres)).toEqual([]);
  });

  it("plusieurs pays au pilote : le seuil le plus prudent de chacun", () => {
    expect(
      seuilsLesPlusPrudents([
        SEUILS,
        { ...AUCUN_SEUIL, detresse_delai_heures: 1, budget_hebdomadaire_usd: 50 },
      ]),
    ).toEqual({ ...SEUILS, detresse_delai_heures: 1 });
    expect(seuilsLesPlusPrudents([AUCUN_SEUIL])).toEqual(AUCUN_SEUIL);
  });
});
