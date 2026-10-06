import { describe, expect, it } from "vitest";
import { formaterDuree, formaterUSD } from "./format";

describe("formats d'affichage", () => {
  it("durées et montants en français", () => {
    expect(formaterDuree(34)).toBe("34 s");
    expect(formaterDuree(485)).toBe("8 min 05 s");
    expect(formaterUSD(0.5712)).toBe("0,57 USD");
  });
});
