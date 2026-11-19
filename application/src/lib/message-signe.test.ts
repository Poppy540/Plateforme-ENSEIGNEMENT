import { describe, expect, it } from "vitest";
import { lireMessage, parametresMessage } from "./message-signe";

// Revue du Jalon 24, S22 : un message passé dans l'adresse n'est affiché que s'il est signé par le serveur.
const SECRET = "secret-de-test-uniquement";

describe("messages signés dans l'adresse", () => {
  it("un message écrit par le serveur se relit", () => {
    const p = parametresMessage({ erreur: "Date invalide." }, SECRET);
    expect(lireMessage(p, SECRET)).toEqual({ erreur: "Date invalide.", ok: null });
    expect(lireMessage(parametresMessage({ ok: "Enregistré." }, SECRET), SECRET)).toEqual({
      erreur: null,
      ok: "Enregistré.",
    });
  });

  it("un lien fabriqué, modifié ou signé avec un autre secret n'affiche rien", () => {
    expect(lireMessage({ erreur: "Appelez le +999 000 000 00" }, SECRET)).toEqual({
      erreur: null,
      ok: null,
    });
    const p = parametresMessage({ erreur: "Date invalide." }, SECRET);
    expect(lireMessage({ ...p, erreur: "Appelez le +999 000 000 00" }, SECRET).erreur).toBeNull();
    expect(
      lireMessage(parametresMessage({ ok: "Enregistré." }, "autre-secret"), SECRET).ok,
    ).toBeNull();
    // La signature d'une erreur ne vaut pas pour un « ok » de même texte.
    expect(lireMessage({ ok: "Date invalide.", s: p.s }, SECRET).ok).toBeNull();
  });

  it("un message trop long est coupé avant la signature", () => {
    const p = parametresMessage({ erreur: "x".repeat(500) }, SECRET);
    expect(lireMessage(p, SECRET).erreur).toHaveLength(200);
  });
});
