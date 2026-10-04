import { describe, expect, it } from "vitest";
import { codeValide, lireIdentifiant, masquer, normaliserTelephone } from "./identifiants";

describe("identifiants de connexion", () => {
  it("normalise un numéro international saisi avec espaces, points ou 00", () => {
    expect(normaliserTelephone("+241 06 12 34 56")).toBe("+24106123456");
    expect(normaliserTelephone("00241.06.12.34.56")).toBe("+24106123456");
  });

  it("refuse un numéro sans indicatif ou trop court", () => {
    expect(normaliserTelephone("06123456")).toBeNull();
    expect(normaliserTelephone("+12")).toBeNull();
  });

  it("reconnaît un email ou un téléphone", () => {
    expect(lireIdentifiant("Parent@Exemple.org ")).toEqual({
      type: "email",
      valeur: "parent@exemple.org",
    });
    expect(lireIdentifiant("+999 000 000 01")).toEqual({
      type: "telephone",
      valeur: "+99900000001",
    });
    expect(lireIdentifiant("n'importe quoi")).toBeNull();
  });

  it("accepte seulement un code à 6 chiffres", () => {
    expect(codeValide("123 456")).toBe("123456");
    expect(codeValide("12345")).toBeNull();
    expect(codeValide("abcdef")).toBeNull();
  });

  it("masque l'identifiant pour l'affichage et les journaux", () => {
    const masque = masquer({ type: "telephone", valeur: "+24106123456" });
    expect(masque.startsWith("+241")).toBe(true);
    expect(masque).not.toContain("061234");
    expect(masquer({ type: "email", valeur: "parent@exemple.org" })).toBe("p•••@exemple.org");
  });
});
