import { describe, expect, it } from "vitest";
import { lireLecon } from "./lecon";

describe("leçon écrite", () => {
  it("garde le texte des sections, le glossaire et la sécurité, dans l'ordre", () => {
    const lecon = lireLecon({
      version: 3,
      sections: [
        { type: "accroche", titre: "Une question", texte: " Pourquoi ? " },
        { type: "pause", titre: "À toi", texte: "" },
        { type: "resume", titre: "À retenir", texte: "U = R × I" },
      ],
      glossaire: [
        { terme: "Ohm", definition: "Unité de résistance" },
        { terme: "", definition: "x" },
      ],
      consignes: ["Observer le schéma"],
      securite: ["Ne jamais toucher une prise"],
    });
    expect(lecon?.version).toBe(3);
    expect(lecon?.sections.map((s) => s.texte)).toEqual(["Pourquoi ?", "U = R × I"]);
    expect(lecon?.glossaire).toHaveLength(1);
    expect(lecon?.securite).toEqual(["Ne jamais toucher une prise"]);
  });

  it("rien à afficher sans texte", () => {
    expect(lireLecon(null)).toBeNull();
    expect(lireLecon({ sections: [] })).toBeNull();
    expect(lireLecon({ sections: [{ titre: "x", texte: 4 }] })).toBeNull();
  });
});
