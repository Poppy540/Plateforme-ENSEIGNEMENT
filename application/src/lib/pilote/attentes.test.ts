import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ATTENTES,
  THEMES,
  decompteAttentes,
  evaluerAttentes,
  type FaitsAttentes,
} from "./attentes";

const RIEN: FaitsAttentes = {
  conditions: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, "a_faire"])),
  periodeSaisie: false,
  chapitresPilote: 0,
  classes: 0,
  questionnaireValide: null,
  seuilsComplets: false,
  skillsAValider: ["agents/_commun/skills/eleves-mineurs/SKILL.md"],
};
const TOUT: FaitsAttentes = {
  conditions: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, "remplie"])),
  periodeSaisie: true,
  chapitresPilote: 3,
  classes: 1,
  questionnaireValide: true,
  seuilsComplets: true,
  skillsAValider: [],
};

describe("ce qui attend le propriétaire (ADR 0089)", () => {
  it("codes uniques, thèmes connus, sans pays en dur", () => {
    expect(new Set(ATTENTES.map((a) => a.code)).size).toBe(ATTENTES.length);
    expect(ATTENTES.every((a) => a.theme in THEMES)).toBe(true);
    expect(JSON.stringify(ATTENTES)).not.toMatch(/Gabon|ga-|gabon/);
  });

  it("au départ : tout ce qui se vérifie est à faire ; le reste est à confirmer", () => {
    const attentes = evaluerAttentes(RIEN);
    const { faits, aFaire, aConfirmer } = decompteAttentes(attentes);
    expect(faits).toBe(0);
    expect(aConfirmer).toBe(ATTENTES.filter((a) => !a.verifier).length);
    expect(aFaire + aConfirmer).toBe(ATTENTES.length);
  });

  it("tout fait côté plateforme : il ne reste que les points à confirmer", () => {
    const { aFaire, faits } = decompteAttentes(evaluerAttentes(TOUT));
    expect(aFaire).toBe(0);
    expect(faits).toBe(ATTENTES.filter((a) => a.verifier).length);
  });

  it("seuils : complets ET condition 11 remplie ; veille : conditions 8 et 9", () => {
    const etat = (f: FaitsAttentes, code: string) =>
      evaluerAttentes(f).find((a) => a.code === code)!.etat;
    expect(etat({ ...TOUT, seuilsComplets: false }, "seuils")).toBe("a_faire");
    expect(etat({ ...TOUT, conditions: { ...TOUT.conditions, 11: "a_revoir" } }, "seuils")).toBe(
      "a_faire",
    );
    expect(etat({ ...TOUT, conditions: { ...TOUT.conditions, 9: "a_faire" } }, "veille")).toBe(
      "a_faire",
    );
    expect(etat({ ...TOUT, questionnaireValide: null }, "questionnaire")).toBe("a_faire");
  });

  it("chaque point figure dans docs/attentes-proprietaire.md, et rien d'autre", () => {
    const doc = readFileSync(
      resolve(__dirname, "../../../../docs/attentes-proprietaire.md"),
      "utf8",
    );
    const codes = [...doc.matchAll(/<!-- attente:([a-z_]+) -->/g)].map((m) => m[1]);
    expect(codes.sort()).toEqual(ATTENTES.map((a) => a.code).sort());
  });
});
