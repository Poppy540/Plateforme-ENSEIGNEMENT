import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { libellesFamilles } from "@/lib/pack-pays/lecture";
import { texteAlerte } from "./veille";

describe("alerte de veille", () => {
  it("donne le nombre et les motifs, le lien de l'administration, et rien sur l'élève", () => {
    const texte = texteAlerte(
      [
        { motif: "detresse", envois: 1 },
        { motif: "detresse", envois: 1 },
      ],
      "https://exemple.invalid/administration",
    );
    expect(texte).toBe(
      "Plateforme : 2 élément(s) de priorité 1 à traiter (détresse). Suivez la procédure de détresse et ouvrez la file humaine : https://exemple.invalid/administration",
    );
  });

  it("annonce une relance quand un élément n'est toujours pas pris en charge", () => {
    const texte = texteAlerte([{ motif: "detresse", envois: 2 }], "/administration");
    expect(texte).toMatch(/^RELANCE — /);
    expect(texte).toContain("toujours pas pris en charge");
  });
});

describe("libellés des familles du pack", () => {
  it("lit familles.yaml du pack pilote ; dossier sans fichier : aucun libellé", () => {
    const racine = resolve(__dirname, "../../../..");
    expect(libellesFamilles(resolve(racine, "referentiels/gabon")).mathematiques).toBe(
      "Mathématiques",
    );
    expect(libellesFamilles(resolve(racine, "referentiels/pays-inexistant"))).toEqual({});
  });
});
