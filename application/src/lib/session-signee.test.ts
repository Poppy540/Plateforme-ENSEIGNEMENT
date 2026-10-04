import { describe, expect, it } from "vitest";
import { signerSession, verifierSession } from "./session-signee";

const secret = "a".repeat(40);
const contenu = {
  utilisateur: "11111111-1111-1111-1111-111111111111",
  expire: Date.now() + 60_000,
};

describe("session signée", () => {
  it("vérifie une session valide", () => {
    expect(verifierSession(signerSession(contenu, secret), secret)).toEqual(contenu);
  });

  it("refuse une session modifiée", () => {
    const [donnees, signature] = signerSession(contenu, secret).split(".");
    const autre = Buffer.from(
      JSON.stringify({ ...contenu, utilisateur: "22222222-2222-2222-2222-222222222222" }),
    ).toString("base64url");
    expect(verifierSession(`${autre}.${signature}`, secret)).toBeNull();
    const autreCaractere = signature[0] === "A" ? "B" : "A"; // toujours différent de l'original
    expect(verifierSession(`${donnees}.${autreCaractere}${signature.slice(1)}`, secret)).toBeNull();
  });

  it("refuse une session signée avec un autre secret ou expirée", () => {
    expect(verifierSession(signerSession(contenu, secret), "b".repeat(40))).toBeNull();
    expect(
      verifierSession(signerSession({ ...contenu, expire: Date.now() - 1 }, secret), secret),
    ).toBeNull();
    expect(verifierSession(undefined, secret)).toBeNull();
    expect(verifierSession("pas-un-jeton", secret)).toBeNull();
  });
});
