import { describe, expect, it } from "vitest";
import { demandeDeLaPlateforme } from "./meme-origine";

const demande = (entetes: Record<string, string>) =>
  new Request("https://exemple.test/api/administration/fin-pilote", { headers: entetes });

describe("demande venue de la plateforme (revue du Jalon 16, S4)", () => {
  it("Sec-Fetch-Site : seule la même origine compte", () => {
    expect(demandeDeLaPlateforme(demande({ "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(demandeDeLaPlateforme(demande({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(demandeDeLaPlateforme(demande({ "sec-fetch-site": "none" }))).toBe(false);
    expect(
      demandeDeLaPlateforme(
        demande({ "sec-fetch-site": "cross-site", referer: "https://exemple.test/administration" }),
      ),
    ).toBe(false);
  });

  it("sans Sec-Fetch-Site : Referer de la même origine, sinon non", () => {
    expect(demandeDeLaPlateforme(demande({ referer: "https://exemple.test/administration" }))).toBe(
      true,
    );
    expect(demandeDeLaPlateforme(demande({ referer: "https://autre.test/piege" }))).toBe(false);
    expect(demandeDeLaPlateforme(demande({ referer: "pas une adresse" }))).toBe(false);
    expect(demandeDeLaPlateforme(demande({}))).toBe(false);
  });
});
