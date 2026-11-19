import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  envoiSurveillance,
  installerNettoyageConsole,
  ligneJournal,
  nettoyer,
  texteNettoye,
} from "./journal";

// Valeurs FICTIVES uniquement.
describe("nettoyage du journal (ADR 0056)", () => {
  it("retire numéros, emails, liens, adresses de connexion, identifiants, jetons et autorisations", () => {
    const brut = [
      "contact +999 000 001 01",
      "parent@exemple.invalid",
      "https://site.exemple/parent/confirmer?jeton=abc",
      "postgresql://serveur_application:mot-de-passe@hote:5432/postgres",
      "élève 11111111-2222-4333-8444-555555555555",
      "empreinte 4d4d259267d648f8bcd1af3305f5f50cb7193db4",
      "Authorization: Bearer jeton-tres-secret",
      "jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl",
      "cle sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUV",
    ].join(" ; ");
    const propre = nettoyer(brut);
    for (const secret of [
      "999 000",
      "parent@",
      "site.exemple",
      "mot-de-passe",
      "11111111-2222",
      "4d4d2592",
      "jeton-tres-secret",
      "eyJhbGci",
      "sk-ant-api03",
    ])
      expect(propre, secret).not.toContain(secret);
    expect(propre).toContain("Bearer [masqué]");
  });

  it("écrit une ligne JSON courte et nettoyée", () => {
    const ligne = JSON.parse(
      ligneJournal(
        "erreur",
        "erreur_requete",
        { chemin: "/parent/rapport", message: "Clé (contact)=(a@b.example) déjà présente", n: 3 },
        new Date("2026-10-21T00:00:00Z"),
      ),
    );
    expect(ligne).toMatchObject({
      horodatage: "2026-10-21T00:00:00.000Z",
      niveau: "erreur",
      evenement: "erreur_requete",
      chemin: "/parent/rapport",
      n: 3,
    });
    expect(ligne.message).not.toContain("a@b.example");
    // L'empreinte numérique d'une erreur Next.js est gardée ; tout autre texte du même champ est nettoyé.
    expect(JSON.parse(ligneJournal("erreur", "e", { empreinte: "2948212345" })).empreinte).toBe(
      "2948212345",
    );
    expect(
      JSON.parse(ligneJournal("erreur", "e", { empreinte: "x@y.example" })).empreinte,
    ).not.toContain("x@y");
  });

  it("nettoie aussi une erreur et sa pile", () => {
    const e = new Error("Échec pour +99900000101");
    expect(texteNettoye(e)).not.toContain("99900000101");
    expect(texteNettoye({ contact: "x@y.example" })).not.toContain("x@y.example");
  });

  it("n'envoie au service de surveillance qu'en https, avec un jeton, sans jamais échouer", async () => {
    expect(envoiSurveillance({})).toBeNull();
    expect(envoiSurveillance({ JOURNAL_HTTP_URL: "http://x", JOURNAL_HTTP_JETON: "j" })).toBeNull();
    const appels: { url: string; init: RequestInit }[] = [];
    const envoi = envoiSurveillance(
      { JOURNAL_HTTP_URL: "https://surveillance.exemple/v1", JOURNAL_HTTP_JETON: "jeton-fictif" },
      (async (url: string, init: RequestInit) => {
        appels.push({ url, init });
        throw new Error("hors service");
      }) as typeof fetch,
    )!;
    await expect(envoi('{"niveau":"erreur"}')).resolves.toBeUndefined();
    expect(appels[0].url).toBe("https://surveillance.exemple/v1");
    expect(new Headers(appels[0].init.headers).get("authorization")).toBe("Bearer jeton-fictif");
  });

  it("nettoie toute sortie de la console, une seule fois", () => {
    const sortie = vi.fn();
    const faux = {
      log: sortie,
      info: sortie,
      warn: sortie,
      error: sortie,
      debug: sortie,
    } as unknown as Console;
    installerNettoyageConsole(faux);
    installerNettoyageConsole(faux);
    faux.error(
      "Échec d'envoi à",
      "parent@exemple.invalid",
      new Error("jeton 0123456789abcdef0123456789abcdef"),
    );
    expect(sortie).toHaveBeenCalledTimes(1);
    const texte = String(sortie.mock.calls[0][0]);
    expect(texte).not.toContain("parent@");
    expect(texte).not.toContain("0123456789abcdef0123");
  });
});

describe("garde : pas de console directe dans l'application", () => {
  it("tout passe par le journal (src/lib/journal.ts)", () => {
    const racine = resolve(__dirname, "..");
    const fichiers: string[] = [];
    const parcourir = (d: string) => {
      for (const n of readdirSync(d)) {
        const c = join(d, n);
        if (statSync(c).isDirectory()) parcourir(c);
        else if (/\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n)) fichiers.push(c);
      }
    };
    parcourir(racine);
    const fautifs = fichiers.filter(
      (f) =>
        !f.endsWith(join("lib", "journal.ts")) &&
        /\bconsole\.(log|info|warn|error|debug)\(/.test(readFileSync(f, "utf8")),
    );
    expect(fautifs).toEqual([]);
  });
});
