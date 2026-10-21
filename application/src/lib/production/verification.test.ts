import { describe, expect, it } from "vitest";
import { verifierApiDeDonnees, verifierConfiguration } from "./verification";

// Valeurs FICTIVES de test (aucun secret réel).
const COMPLETE = {
  ENVIRONNEMENT: "production",
  URL_PUBLIQUE: "https://plateforme.exemple",
  SECRET_SESSION: "Zq7-vP2!mK9#tR4$wX8&nB3*hL6@jD1^cF5",
  SEL_AUDIT: "sel-fictif-de-test",
  SEL_OPPOSITION: "sel-d-opposition-fictif-de-plus-de-32-caracteres",
  URL_BASE_DONNEES: "postgresql://serveur_application@base.exemple/postgres",
  URL_SUPABASE: "https://projet.exemple",
  CLE_PUBLIQUE_SUPABASE: "cle-publique-fictive",
  CLE_SERVICE_SUPABASE: "cle-service-fictive",
  ANTHROPIC_API_KEY: "cle-fictive",
  JETON_EXECUTEUR: "jeton-executeur-fictif-de-plus-de-32-caracteres",
  CONTACTS_VEILLE: "+999000000001",
  FOURNISSEUR_SMS: "twilio",
  TWILIO_COMPTE: "ACfictif",
  TWILIO_JETON: "jeton-fictif",
  SMS_EXPEDITEUR: "PLATEFORME",
  FOURNISSEUR_EMAIL: "brevo",
  BREVO_CLE: "cle-fictive",
  EMAIL_EXPEDITEUR: "ne-pas-repondre@plateforme.exemple",
};

describe("vérification de la configuration de production", () => {
  it("accepte une configuration complète", () => {
    expect(verifierConfiguration(COMPLETE).filter((c) => !c.ok)).toEqual([]);
  });

  it("signale ce qui manque ou vient du modèle, sans jamais rendre une valeur", () => {
    const constats = verifierConfiguration({
      ...COMPLETE,
      ENVIRONNEMENT: "developpement",
      URL_PUBLIQUE: "http://localhost:3000",
      SECRET_SESSION: "remplacer-moi-par-au-moins-32-caracteres-aleatoires",
      FOURNISSEUR_SMS: "simulation",
      BREVO_CLE: "",
      MODE_VIDEO: "simulation",
    });
    const enEchec = constats.filter((c) => !c.ok).map((c) => c.point);
    expect(enEchec).toEqual(
      expect.arrayContaining([
        "ENVIRONNEMENT",
        "URL_PUBLIQUE",
        "SECRET_SESSION",
        "FOURNISSEUR_SMS",
        "BREVO_CLE",
        "MODE_VIDEO",
      ]),
    );
    const texte = JSON.stringify(constats);
    const secrets = [
      "SECRET_SESSION",
      "SEL_AUDIT",
      "SEL_OPPOSITION",
      "URL_BASE_DONNEES",
      "CLE_SERVICE_SUPABASE",
      "ANTHROPIC_API_KEY",
      "JETON_EXECUTEUR",
      "TWILIO_JETON",
      "CONTACTS_VEILLE",
    ] as const;
    for (const nom of secrets) expect(texte).not.toContain(COMPLETE[nom]);
    expect(texte).not.toContain("remplacer-moi");
  });
});

describe("vidéo réelle (ADR 0055)", () => {
  const REEL = {
    ...COMPLETE,
    MODE_VIDEO: "reel",
    BUDGET_VIDEO_USD: "15",
    AVATAR_HTTP_URL: "https://avatar.exemple/v1",
    AVATAR_HTTP_JETON: "jeton-avatar-fictif",
    AVATAR_COUT_MINUTE_USD: "1.2",
    CLOUDFLARE_COMPTE: "compte-fictif",
    CLOUDFLARE_JETON_STREAM: "jeton-stream-fictif",
    STREAM_SOUS_DOMAINE: "customer-abc123.cloudflarestream.com",
  };

  it("accepte une configuration complète, sans afficher de valeur", () => {
    const constats = verifierConfiguration(REEL);
    expect(constats.filter((c) => !c.ok)).toEqual([]);
    expect(JSON.stringify(constats)).not.toContain("jeton-stream-fictif");
  });

  it("signale ce qui manque", () => {
    const enEchec = verifierConfiguration({
      ...REEL,
      AVATAR_HTTP_URL: "http://avatar.exemple",
      CLOUDFLARE_JETON_STREAM: "",
      STREAM_SOUS_DOMAINE: "evil.example",
    })
      .filter((c) => !c.ok)
      .map((c) => c.point);
    expect(enEchec).toEqual(["CLOUDFLARE_JETON_STREAM", "AVATAR_HTTP_URL", "STREAM_SOUS_DOMAINE"]);
  });
});

describe("API de données de Supabase (D1)", () => {
  const reponse = (statut: number, corps: unknown) =>
    (async () => new Response(JSON.stringify(corps), { status: statut })) as typeof fetch;

  it("signale une API ouverte (description des tables rendue)", async () => {
    const c = await verifierApiDeDonnees(COMPLETE, reponse(200, { paths: { "/eleves": {} } }));
    expect(c.ok).toBe(false);
    expect(c.message).toContain("ouverte");
    expect(JSON.stringify(c)).not.toContain(COMPLETE.CLE_PUBLIQUE_SUPABASE);
  });

  it("accepte une API fermée ou un schéma non exposé", async () => {
    expect((await verifierApiDeDonnees(COMPLETE, reponse(404, {}))).ok).toBe(true);
    expect((await verifierApiDeDonnees(COMPLETE, reponse(406, { code: "PGRST106" }))).ok).toBe(
      true,
    );
  });

  it("ne conclut pas sans adresse ni réponse", async () => {
    expect((await verifierApiDeDonnees({}, reponse(404, {}))).ok).toBe(false);
    const injoignable = (async () => {
      throw new Error("réseau");
    }) as typeof fetch;
    expect((await verifierApiDeDonnees(COMPLETE, injoignable)).ok).toBe(false);
  });
});
