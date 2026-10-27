import { cpSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  composerPrompt,
  ErreurConfigurationAgent,
  lireModele,
  lireValeurs,
  remplir,
} from "./chargeur-prompt";

const racine = resolve(__dirname, "../../../..");
const configuration = {
  agent: "professeur",
  codePays: "ga",
  unite: "ga-3e-mathematiques",
  skills: ["_commun/skills/contenu-non-fiable", "professeur/skills/echelle-d-indices"],
  valeursDynamiques: { LISTE_CHAPITRES: "Chapitre A ; Chapitre B", CHAPITRE_EN_COURS: "en cours" },
};

describe("chargeur de prompt", () => {
  it("garde le prompt du cadrage tel quel, sans la section des valeurs pilote", () => {
    const modele = lireModele(racine, "professeur");
    const original = readFileSync(resolve(racine, "agents/professeur/prompt.md"), "utf8");
    expect(original.startsWith(modele)).toBe(true);
    expect(modele).not.toContain("VALEURS POUR L'UNITÉ PILOTE");
    expect(modele).toContain("# CE QUE TU NE DOIS JAMAIS FAIRE");
  });

  it("compose le prompt de l'unité pilote sans variable restante", () => {
    const prompt = composerPrompt(configuration, racine);
    expect(prompt).not.toMatch(/\{\{[A-Z_]+\}\}/);
    expect(prompt).toContain("Chapitre A ; Chapitre B");
    expect(prompt).toContain("# RÈGLES COMMUNES À TOUS LES AGENTS");
    expect(prompt).toContain("Se faire passer pour un humain.");
    expect(prompt).toContain("# SKILL : echelle-d-indices");
    expect(prompt).not.toContain("## Source et licence");
    expect(prompt).not.toMatch(/^---$/m);
  });

  it("compose les prompts du Professeur, du Scénariste et de l'Évaluateur pour la famille Maths 6e-3e", () => {
    for (const niveau of ["6e", "5e", "4e", "3e"])
      for (const agent of ["professeur", "scenariste", "evaluateur"]) {
        const prompt = composerPrompt(
          {
            agent,
            codePays: "ga",
            unite: `ga-${niveau}-mathematiques`,
            skills: [],
            valeursDynamiques: { LISTE_CHAPITRES: "x", CHAPITRE_EN_COURS: "x", DUREE: "x" },
          },
          racine,
        );
        expect(prompt, `${agent} ${niveau}`).not.toMatch(/\{\{[A-Z_]+\}\}/);
        expect(prompt).toContain(`${niveau}`);
      }
  });

  it("est identique d'un appel à l'autre (condition de la mise en cache)", () => {
    expect(composerPrompt(configuration, racine)).toBe(composerPrompt(configuration, racine));
  });

  it("refuse une unité non configurée ou une variable vide", () => {
    expect(() => composerPrompt({ ...configuration, unite: "ga-3e-anglais" }, racine)).toThrow(
      ErreurConfigurationAgent,
    );
    expect(() =>
      remplir("Bonjour {{NOM_AVATAR}} {{SERIE}}", { NOM_AVATAR: null, SERIE: "" }),
    ).toThrow(/NOM_AVATAR/);
    expect(remplir("Classe {{NIVEAU}}{{SERIE}}", { NIVEAU: "3e", SERIE: "" })).toBe("Classe 3e");
  });

  it("refuse un pays sans pack", () => {
    expect(() => composerPrompt({ ...configuration, codePays: "xx" }, racine)).toThrow(
      /Aucun pack/,
    );
  });
});

describe("fichiers gardés en mémoire (ADR 0064)", () => {
  it("relit un fichier modifié, et rend des valeurs que l'appelant peut compléter sans toucher au cache", () => {
    const dossier = mkdtempSync(resolve(tmpdir(), "pack-"));
    cpSync(
      resolve(racine, "referentiels/gabon/agents/professeur"),
      resolve(dossier, "agents/professeur"),
      {
        recursive: true,
      },
    );
    const fichier = resolve(dossier, "agents/professeur/ga-3e-mathematiques.yaml");
    const premieres = lireValeurs(dossier, "professeur", "ga-3e-mathematiques");
    premieres.NOM_AVATAR = "modifié par l'appelant";
    expect(lireValeurs(dossier, "professeur", "ga-3e-mathematiques").NOM_AVATAR).not.toBe(
      "modifié par l'appelant",
    );
    writeFileSync(fichier, "variables:\n  NOM_AVATAR: Professeur fictif\n");
    utimesSync(fichier, new Date(), new Date(Date.now() + 5000));
    expect(lireValeurs(dossier, "professeur", "ga-3e-mathematiques")).toEqual({
      NOM_AVATAR: "Professeur fictif",
    });
  });
});
