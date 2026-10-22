// Français 3e (Jalon 7, étape 4 ; ADR 0057) : programme provisoire repris du cadrage, graphe de 3e, prompts des agents
// complets, garde-fous de la famille Français (jamais rédiger à la place de l'élève) présents dans le Professeur.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { composerPrompt, dossierPack } from "../agents/chargeur-prompt";
import { lirePack } from "./lecture";

const racine = resolve(__dirname, "../../../..");
const UNITE = "ga-3e-francais";

describe("Français 3e (pack Gabon)", () => {
  const pack = lirePack(dossierPack(racine, "ga"));

  it("reprend les chapitres du cadrage (importés « à valider »)", () => {
    expect(pack.programmes[UNITE].map((c) => c.titre)).toEqual([
      "La nouvelle réaliste et fantastique",
      "L'argumentation : le dialogue argumentatif",
      "La poésie engagée du XXe siècle",
      "Le théâtre classique",
      "L'autobiographie",
      "Préparation BEPC : résumé, questions, rédaction",
    ]);
  });

  it("propose 6 liens dans la classe de 3e, vers la préparation du BEPC surtout", () => {
    const liens = pack.prerequis.filter((l) => l.chapitre.unite === UNITE);
    expect(liens).toHaveLength(6);
    expect(liens.every((l) => l.prerequis.unite === UNITE)).toBe(true);
  });

  it.each(["professeur", "scenariste", "evaluateur"])(
    "compose le prompt %s sans variable manquante",
    (agent) => {
      const prompt = composerPrompt(
        {
          agent,
          codePays: "ga",
          unite: UNITE,
          skills: [],
          valeursDynamiques: { LISTE_CHAPITRES: "x", CHAPITRE_EN_COURS: "x", DUREE: "10" },
        },
        racine,
      );
      expect(prompt).not.toMatch(/\{\{[A-Z_]+\}\}/);
      expect(prompt).toContain("Français");
      if (agent === "professeur") {
        expect(prompt).toContain(
          "ne jamais écrire un résumé, une rédaction ou une réponse notée à sa place",
        );
        expect(prompt).toContain("sans inventer d'auteur ni de citation");
      }
    },
  );
});
