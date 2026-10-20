// Tests de contrat des fournisseurs de messages : forme exacte des requêtes, authentification, classement des
// erreurs. Aucun appel réseau : un faux « fetch » enregistre la requête et renvoie la réponse prévue.
import { describe, expect, it } from "vitest";
import {
  canalDe,
  fournisseurBrevo,
  fournisseurHttp,
  fournisseurTwilio,
  type Fetch,
} from "./fournisseurs";

function fauxFetch(statut: number, corps: unknown = {}) {
  const appels: { url: string; init: RequestInit }[] = [];
  const f: Fetch = async (url, init) => {
    appels.push({ url, init });
    return new Response(JSON.stringify(corps), { status: statut });
  };
  return { f, appels };
}
const enPanne: Fetch = async () => {
  throw new TypeError("réseau coupé");
};

const SMS = { canal: "sms" as const, destinataire: "+999000000001", texte: "Bonjour (fictif)" };
const EMAIL = {
  canal: "email" as const,
  destinataire: "parent@exemple.invalid",
  objet: "Objet fictif",
  texte: "Bonjour (fictif)",
};

describe("Twilio (SMS)", () => {
  const config = { compte: "ACfictif", jeton: "jeton-fictif", expediteur: "PLATEFORME" };

  it("envoie un formulaire To/From/Body avec l'authentification Basic du compte", async () => {
    const { f, appels } = fauxFetch(201, { sid: "SMfictif" });
    const r = await fournisseurTwilio(config, f).envoyer(SMS);
    expect(r).toEqual({ ok: true, reference: "SMfictif" });
    expect(appels[0].url).toBe("https://api.twilio.com/2010-04-01/Accounts/ACfictif/Messages.json");
    const entetes = appels[0].init.headers as Record<string, string>;
    expect(entetes.authorization).toBe(
      `Basic ${Buffer.from("ACfictif:jeton-fictif").toString("base64")}`,
    );
    expect(entetes["content-type"]).toBe("application/x-www-form-urlencoded");
    const corps = new URLSearchParams(String(appels[0].init.body));
    expect(Object.fromEntries(corps)).toEqual({
      To: "+999000000001",
      From: "PLATEFORME",
      Body: "Bonjour (fictif)",
    });
    expect(appels[0].init.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    [400, "refuse"],
    [401, "configuration"],
    [429, "temporaire"],
    [503, "temporaire"],
  ] as const)("classe une réponse %i en « %s »", async (statut, categorie) => {
    const r = await fournisseurTwilio(config, fauxFetch(statut).f).envoyer(SMS);
    expect(r).toEqual({ ok: false, categorie, statut });
  });

  it("refuse un email et classe une coupure réseau en « temporaire »", async () => {
    const { f, appels } = fauxFetch(201);
    expect(await fournisseurTwilio(config, f).envoyer(EMAIL)).toMatchObject({
      ok: false,
      categorie: "configuration",
    });
    expect(appels).toHaveLength(0);
    expect(await fournisseurTwilio(config, enPanne).envoyer(SMS)).toEqual({
      ok: false,
      categorie: "temporaire",
      statut: null,
    });
  });
});

describe("Brevo (email)", () => {
  it("envoie le JSON sender/to/subject/textContent avec la clé dans l'en-tête api-key", async () => {
    const { f, appels } = fauxFetch(201, { messageId: "<fictif@brevo>" });
    const r = await fournisseurBrevo(
      {
        cle: "cle-fictive",
        expediteur: "ne-pas-repondre@exemple.invalid",
        nomExpediteur: "Plateforme",
      },
      f,
    ).envoyer(EMAIL);
    expect(r).toEqual({ ok: true, reference: "<fictif@brevo>" });
    expect(appels[0].url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((appels[0].init.headers as Record<string, string>)["api-key"]).toBe("cle-fictive");
    expect(JSON.parse(String(appels[0].init.body))).toEqual({
      sender: { name: "Plateforme", email: "ne-pas-repondre@exemple.invalid" },
      to: [{ email: "parent@exemple.invalid" }],
      subject: "Objet fictif",
      textContent: "Bonjour (fictif)",
    });
  });
});

describe("passerelle HTTP générique", () => {
  it("exige https et envoie le message en JSON avec un jeton Bearer", async () => {
    expect(() =>
      fournisseurHttp({ url: "http://passerelle.invalid", jeton: "x", canaux: ["sms"] }),
    ).toThrow(/https/);
    const { f, appels } = fauxFetch(200, { reference: "ref-1" });
    const passerelle = fournisseurHttp(
      { url: "https://passerelle.invalid/envoi", jeton: "jeton-fictif", canaux: ["sms", "email"] },
      f,
    );
    expect(await passerelle.envoyer(SMS)).toEqual({ ok: true, reference: "ref-1" });
    expect((appels[0].init.headers as Record<string, string>).authorization).toBe(
      "Bearer jeton-fictif",
    );
    expect(JSON.parse(String(appels[0].init.body))).toEqual({
      canal: "sms",
      destinataire: "+999000000001",
      objet: null,
      texte: "Bonjour (fictif)",
    });
  });
});

it("choisit le canal d'après le destinataire", () => {
  expect(canalDe("parent@exemple.invalid")).toBe("email");
  expect(canalDe("+999000000001")).toBe("sms");
});
