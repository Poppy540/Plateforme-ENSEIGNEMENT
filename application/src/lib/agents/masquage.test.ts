import { describe, expect, it } from "vitest";
import { masquerTexteEleve } from "./masquage";

// Numéros FICTIFS (indicatif « +999 » du pack fictif, ou formes génériques) : données de test uniquement.
describe("masquage du texte d'un élève avant un agent pédagogique (ADR 0062)", () => {
  it("masque numéros de téléphone, emails, liens et identifiants", () => {
    for (const [texte, reste] of [
      ["appelle-moi au +999 77 12 34 56 stp", "appelle-moi au [numéro masqué] stp"],
      ["mon numéro c'est 077 12 34 56", "mon numéro c'est [numéro masqué]"],
      ["ou le 06-12-34-56-78", "ou le [numéro masqué]"],
      ["écris au 0771234567 ce soir", "écris au [numéro masqué] ce soir"],
      ["mon mail : eleve.fictif@exemple.test", "mon mail : [email masqué]"],
      ["regarde https://exemple.test/devoir?id=3", "regarde [lien masqué]"],
      ["et www.exemple.test aussi", "et [lien masqué] aussi"],
      ["code 3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f", "code [identifiant masqué]"],
    ])
      expect(masquerTexteEleve(texte)).toBe(reste);
  });

  it("laisse intacts les nombres d'un exercice", () => {
    for (const texte of [
      "AM = 4, AB = 10, AC = 15 donc AN = 15 × 4 / 10 = 6",
      "Calcule 1250 - 375 puis 2024 / 8",
      "π vaut environ 3,14159 et 1 000 000 habitants",
      "la population est de 12 345 678 personnes",
      "les coordonnées sont (2 ; -3) et (10 ; 12)",
      "en 1960, le Gabon… (exemple de date)",
      "-5 + 3 = -2",
    ])
      expect(masquerTexteEleve(texte)).toBe(texte);
  });
});
