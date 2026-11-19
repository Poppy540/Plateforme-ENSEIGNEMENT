import { describe, expect, it } from "vitest";
import {
  AGENTS_FACE_AUX_ELEVES,
  GESTES,
  decisionDuTexte,
  decompteCloture,
  evaluerCloture,
  type FaitsCloture,
} from "./cloture";

const AUJOURDHUI = "2026-10-28";
const RIEN: FaitsCloture = {
  periode_debut: null,
  periode_fin: null,
  rapports_telecharges: 0,
  decision: null,
  decision_le: null,
  acces_eleves_ouvert: true,
  agents_suspendus: [],
};
const ARRET: FaitsCloture = {
  periode_debut: "2026-09-28",
  periode_fin: "2026-10-25",
  rapports_telecharges: 1,
  decision: "Arrêter le pilote : fin prévue (fictif)",
  decision_le: "2026-10-27 10:00:00+00",
  acces_eleves_ouvert: false,
  agents_suspendus: [...AGENTS_FACE_AUX_ELEVES, "scenariste"],
};
const COCHES = GESTES.filter((g) => g.nature === "coche").map((g) => ({
  geste: g.code,
  preuve: "Preuve fictive",
  date_preuve: "2026-10-27",
}));
const geste = (liste: ReturnType<typeof evaluerCloture>, code: string) =>
  liste.find((g) => g.code === code)!;

describe("clôture du pilote (ADR 0085)", () => {
  it("huit gestes, codes uniques, sans pays en dur", () => {
    expect(GESTES).toHaveLength(8);
    expect(new Set(GESTES.map((g) => g.code)).size).toBe(8);
    expect(JSON.stringify(GESTES)).not.toMatch(/Gabon|ga-|3e/);
  });

  it("au départ : rien n'est fait", () => {
    const gestes = evaluerCloture(RIEN, [], AUJOURDHUI);
    expect(decompteCloture(gestes)).toEqual({ faits: 0, total: 8, complete: false });
    expect(geste(gestes, "periode_terminee").detail).toBe("Période du pilote non saisie.");
    expect(geste(gestes, "mise_en_veille").detail).toBe("Dépend de la décision finale.");
  });

  it("arrêt : tout vérifié et coché, clôture complète", () => {
    expect(decompteCloture(evaluerCloture(ARRET, COCHES, AUJOURDHUI))).toEqual({
      faits: 8,
      total: 8,
      complete: true,
    });
  });

  it("arrêt sans mise en veille : accès ouvert ou agents actifs, à faire", () => {
    const gestes = evaluerCloture(
      { ...ARRET, acces_eleves_ouvert: true, agents_suspendus: ["professeur"] },
      COCHES,
      AUJOURDHUI,
    );
    expect(geste(gestes, "mise_en_veille")).toMatchObject({
      etat: "a_faire",
      detail:
        "Accès des élèves encore ouvert ; agents encore actifs : evaluateur, support, tuteur.",
    });
    expect(decompteCloture(gestes).complete).toBe(false);
  });

  it("prolonger : la mise en veille est sans objet ; pilote pas terminé, rapport à télécharger après", () => {
    const gestes = evaluerCloture(
      {
        ...ARRET,
        periode_fin: "2026-11-30",
        rapports_telecharges: 0,
        decision: "Prolonger le pilote : un mois de plus (fictif)",
        acces_eleves_ouvert: true,
        agents_suspendus: [],
      },
      COCHES,
      AUJOURDHUI,
    );
    expect(geste(gestes, "mise_en_veille").etat).toBe("sans_objet");
    expect(geste(gestes, "periode_terminee").detail).toBe("Le pilote se termine le 2026-11-30.");
    expect(geste(gestes, "rapport_fin").detail).toBe("À télécharger une fois le pilote terminé.");
  });

  it("décision lue dans le texte du journal", () => {
    expect(decisionDuTexte("Élargir le pilote : deux classes (fictif)")).toBe("elargir");
    expect(decisionDuTexte("Note")).toBeNull();
    expect(decisionDuTexte(null)).toBeNull();
  });
});
