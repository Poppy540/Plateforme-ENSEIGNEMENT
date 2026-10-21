// Famille Sciences en 3e (Jalon 6, étape 3 ; ADR 0050) : programmes provisoires de SVT et de Physique-Chimie, graphe
// proposé avec des liens vers les Mathématiques, prompts des agents complets.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { composerPrompt, dossierPack } from "../agents/chargeur-prompt";
import { lirePack } from "./lecture";

const racine = resolve(__dirname, "../../../..");
const UNITES = ["ga-3e-svt", "ga-3e-physique-chimie"];

describe("Sciences 3e (pack Gabon)", () => {
  const pack = lirePack(dossierPack(racine, "ga"));

  it("reprend les chapitres du cadrage (importés « à valider »)", () => {
    expect(pack.programmes["ga-3e-svt"].map((c) => c.titre)).toEqual([
      "La génétique et l'hérédité",
      "L'évolution",
      "Santé et responsabilité (addictions, hygiène)",
      "La Terre, un astre singulier",
      "Révisions BEPC",
    ]);
    expect(pack.programmes["ga-3e-physique-chimie"].map((c) => c.titre)).toEqual([
      "L'énergie et ses transformations",
      "L'électricité : loi d'Ohm, puissance",
      "La chimie des solutions (acides/bases)",
      "Révisions BEPC",
    ]);
  });

  it("propose des liens dans la famille et vers les Mathématiques, jamais d'une classe supérieure", () => {
    const sciences = pack.prerequis.filter((l) => UNITES.includes(l.chapitre.unite));
    expect(sciences).toHaveLength(15);
    const versMaths = sciences.filter((l) => l.prerequis.unite.endsWith("-mathematiques"));
    expect(versMaths).toHaveLength(6);
    expect(versMaths.every((l) => /^ga-(3e|4e|5e|6e)-/.test(l.prerequis.unite))).toBe(true);
  });

  it.each(["professeur", "scenariste", "evaluateur"])(
    "compose le prompt %s de chaque unité",
    (agent) => {
      for (const unite of UNITES) {
        const prompt = composerPrompt(
          {
            agent,
            codePays: "ga",
            unite,
            skills: [],
            valeursDynamiques: { LISTE_CHAPITRES: "x", CHAPITRE_EN_COURS: "x", DUREE: "10" },
          },
          racine,
        );
        expect(prompt, unite).not.toMatch(/\{\{[A-Z_]+\}\}/);
        expect(prompt, unite).toContain("3e");
      }
    },
  );
});
