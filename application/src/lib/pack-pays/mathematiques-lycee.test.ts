// Famille Mathématiques de la 6e à la Terminale (Jalon 5, étape 4 ; ADR 0047) : chaque unité se configure pour
// le Professeur, le Scénariste et l'Évaluateur, sans variable manquante, avec sa classe et sa série.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { composerPrompt, dossierPack } from "../agents/chargeur-prompt";
import { lirePack } from "./lecture";

const racine = resolve(__dirname, "../../../..");

describe("Mathématiques au lycée (pack Gabon)", () => {
  const pack = lirePack(dossierPack(racine, "ga"));
  const unites = Object.keys(pack.programmes).filter((u) => u.endsWith("-mathematiques"));

  it("couvre la 6e à la Terminale, séries C et D", () => {
    expect(unites.sort()).toEqual([
      "ga-1re-c-mathematiques",
      "ga-1re-d-mathematiques",
      "ga-2nde-mathematiques",
      "ga-3e-mathematiques",
      "ga-4e-mathematiques",
      "ga-5e-mathematiques",
      "ga-6e-mathematiques",
      "ga-tle-c-mathematiques",
      "ga-tle-d-mathematiques",
    ]);
  });

  it.each(["professeur", "scenariste", "evaluateur"])(
    "compose le prompt %s de chaque unité, avec sa série",
    (agent) => {
      for (const unite of unites) {
        const prompt = composerPrompt(
          {
            agent,
            codePays: "ga",
            unite,
            skills: [],
            valeursDynamiques: { LISTE_CHAPITRES: "x", CHAPITRE_EN_COURS: "x", DUREE: "15" },
          },
          racine,
        );
        expect(prompt, unite).not.toMatch(/\{\{[A-Z_]+\}\}/);
        if (unite.includes("-c-"))
          expect(prompt, unite).toContain("Mathématiques-Sciences Physiques");
        if (unite.includes("-d-")) expect(prompt, unite).toContain("Mathématiques-SVT");
      }
    },
  );
});
