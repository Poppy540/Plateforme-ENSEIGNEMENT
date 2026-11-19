import { describe, expect, it } from "vitest";
import {
  CONDITIONS_PILOTE,
  decompte,
  evaluerConditions,
  type ConstatVariable,
  type FaitsPilote,
} from "./conditions";

const AUCUN_FAIT: FaitsPilote = {
  chapitres_pilote: 0,
  chapitres_prets: 0,
  chapitres_avec_video: 0,
  familles_pilote: 0,
  familles_sans_referent: 0,
  classes: 0,
  classes_avec_enseignant: 0,
};
const FAITS_PRETS: FaitsPilote = {
  chapitres_pilote: 4,
  chapitres_prets: 4,
  chapitres_avec_video: 1,
  familles_pilote: 1,
  familles_sans_referent: 0,
  classes: 1,
  classes_avec_enseignant: 1,
};
const toutesVariables = (ok: boolean): ConstatVariable[] =>
  CONDITIONS_PILOTE.flatMap((c) => c.variables ?? []).map((point) => ({ point, ok }));
const cocherTout = () =>
  CONDITIONS_PILOTE.filter((c) => c.nature !== "automatique").map((c) => ({
    numero: c.numero,
    preuve: `Preuve fictive ${c.numero}`,
    date_preuve: "2026-10-28",
  }));

describe("conditions du pilote (ADR 0078)", () => {
  it("compte 12 conditions numérotées, sans pays, classe ni matière en dur", () => {
    expect(CONDITIONS_PILOTE.map((c) => c.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const textes = JSON.stringify(CONDITIONS_PILOTE);
    expect(textes).not.toMatch(/Gabon|3e|Mathématiques|ga-/);
    expect(
      CONDITIONS_PILOTE.filter((c) => c.nature === "automatique").map((c) => c.numero),
    ).toEqual([3, 4]);
  });

  it("au départ : rien n'est rempli", () => {
    const conditions = evaluerConditions(AUCUN_FAIT, [], toutesVariables(false));
    expect(conditions.every((c) => c.etat === "a_faire")).toBe(true);
    expect(decompte(conditions)).toEqual({ remplies: 0, total: 12, pret: false });
    expect(conditions[3].verification?.detail).toMatch(/Aucun chapitre du pilote/);
  });

  it("tout vérifié et coché : 12 / 12, décision de démarrer possible", () => {
    const conditions = evaluerConditions(FAITS_PRETS, cocherTout(), toutesVariables(true));
    expect(decompte(conditions)).toEqual({ remplies: 12, total: 12, pret: true });
  });

  it("une coche ne suffit pas quand la vérification échoue : « à revoir »", () => {
    const constats = toutesVariables(true).map((c) =>
      c.point === "ANTHROPIC_API_KEY" ? { ...c, ok: false } : c,
    );
    const conditions = evaluerConditions(FAITS_PRETS, cocherTout(), constats);
    const cinq = conditions.find((c) => c.numero === 5)!;
    expect(cinq.etat).toBe("a_revoir");
    expect(cinq.verification?.detail).toBe("À régler sur le serveur : ANTHROPIC_API_KEY.");
    expect(decompte(conditions).pret).toBe(false);
  });

  it("contenus : 3 chapitres au moins, tous prêts ; référent pour chaque matière", () => {
    const deux = evaluerConditions(
      { ...FAITS_PRETS, chapitres_pilote: 2, chapitres_prets: 2 },
      [],
      [],
    );
    expect(deux[3].etat).toBe("a_faire");
    expect(deux[3].verification?.detail).toMatch(/Il en faut 3 au moins/);
    const incomplet = evaluerConditions({ ...FAITS_PRETS, chapitres_prets: 3 }, [], []);
    expect(incomplet[3].etat).toBe("a_faire");
    const sansReferent = evaluerConditions({ ...FAITS_PRETS, familles_sans_referent: 1 }, [], []);
    expect(sansReferent[2].etat).toBe("a_faire");
    expect(sansReferent[2].verification?.detail).toMatch(/1 matière du pilote sans référent/);
  });

  it("une coche sur une condition automatique est ignorée", () => {
    const conditions = evaluerConditions(
      AUCUN_FAIT,
      [{ numero: 3, preuve: "Coche forcée", date_preuve: "2026-10-28" }],
      [],
    );
    expect(conditions[2].coche).toBeNull();
    expect(conditions[2].etat).toBe("a_faire");
  });
});
