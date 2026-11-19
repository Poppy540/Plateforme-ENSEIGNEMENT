import { describe, expect, it } from "vitest";
import { formaterDuree, formaterUSD, celluleMarkdown } from "./format";

describe("formats d'affichage", () => {
  it("durées et montants en français", () => {
    expect(formaterDuree(34)).toBe("34 s");
    expect(formaterDuree(485)).toBe("8 min 05 s");
    expect(formaterUSD(0.5712)).toBe("0,57 USD");
  });
});

describe("cellule de tableau Markdown (alerte CodeQL du Jalon 25)", () => {
  it("échappe la barre oblique inverse avant la barre verticale : la cellule ne se referme jamais", () => {
    expect(celluleMarkdown("a | b")).toBe("a \\| b");
    expect(celluleMarkdown("a \\| b")).toBe("a \\\\\\| b");
    expect(celluleMarkdown("ligne 1\n  ligne 2")).toBe("ligne 1 ligne 2");
  });
});
