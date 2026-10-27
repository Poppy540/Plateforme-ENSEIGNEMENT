import { describe, expect, it } from "vitest";
import { classeEnSql, empreinteCode, genererCodeInvitation, invitationEnSql } from "./invitation";

describe("codes d'invitation des référents", () => {
  it("génère un code lisible au téléphone, sans caractères ambigus", () => {
    const codes = Array.from({ length: 200 }, genererCodeInvitation);
    for (const code of codes)
      expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("calcule la même empreinte quelle que soit la casse ou les espaces", () => {
    expect(empreinteCode(" abcd-efgh-jkmn ")).toBe(empreinteCode("ABCD-EFGH-JKMN"));
    expect(empreinteCode("ABCD-EFGH-JKMN")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("le SQL ne contient que l'empreinte, jamais le code", () => {
    const code = "ABCD-EFGH-JKMN";
    const sql = invitationEnSql({
      referentiel: "zz-general",
      familles: ["f1", "f'2"],
      empreinte: empreinteCode(code),
      joursDeValidite: 7,
    });
    expect(sql).not.toContain(code);
    expect(sql).toContain("'f''2'");
    expect(sql).toContain("interval '7 days'");
  });

  it("refuse une durée hors limites ou sans famille", () => {
    const base = { referentiel: "zz", familles: ["f"], empreinte: "x" };
    expect(() => invitationEnSql({ ...base, joursDeValidite: 0 })).toThrow();
    expect(() => invitationEnSql({ ...base, joursDeValidite: 90 })).toThrow();
    expect(() => invitationEnSql({ ...base, familles: [], joursDeValidite: 7 })).toThrow();
  });
});

describe("classes du pilote (ADR 0063)", () => {
  const base = {
    referentiel: "zz-general",
    niveau: "n4",
    serie: null,
    nom: "Classe fictive l'A",
    etablissement: "Établissement fictif",
    empreinteClasse: empreinteCode("AAAA-BBBB-CCCC"),
    empreinteEnseignant: empreinteCode("DDDD-EEEE-FFFF"),
    joursCodeClasse: 120,
    joursInvitation: 14,
  };

  it("le SQL ne contient que les empreintes des deux codes", () => {
    const sql = classeEnSql(base);
    expect(sql).not.toContain("AAAA-BBBB-CCCC");
    expect(sql).not.toContain("DDDD-EEEE-FFFF");
    expect(sql).toContain(base.empreinteClasse);
    expect(sql).toContain("'Classe fictive l''A'");
    expect(sql).toContain("serie_id, nom");
    expect(classeEnSql({ ...base, serie: "C" })).toContain("s.code = 'C'");
  });

  it("refuse un nom vide ou des durées hors limites", () => {
    expect(() => classeEnSql({ ...base, nom: " " })).toThrow();
    expect(() => classeEnSql({ ...base, joursCodeClasse: 400 })).toThrow();
    expect(() => classeEnSql({ ...base, joursInvitation: 0 })).toThrow();
  });
});
