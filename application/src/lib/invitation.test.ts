import { describe, expect, it } from "vitest";
import { empreinteCode, genererCodeInvitation, invitationEnSql } from "./invitation";

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
