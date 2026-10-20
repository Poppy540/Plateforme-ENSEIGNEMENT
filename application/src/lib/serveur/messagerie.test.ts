import { afterEach, describe, expect, it, vi } from "vitest";
import { envoyerMessage, fournisseurDuCanal, messagesSimules } from "./messagerie";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("choix du fournisseur de messages", () => {
  it("simule par défaut en développement local", async () => {
    vi.stubEnv("ENVIRONNEMENT", "developpement");
    vi.stubEnv("URL_PUBLIQUE", "");
    expect(fournisseurDuCanal("sms")).toBeNull();
    await envoyerMessage("+999000000001", "Texte fictif", "Objet");
    expect(messagesSimules()[0]).toMatchObject({
      destinataire: "+999000000001",
      texte: "Objet\n\nTexte fictif",
    });
  });

  it("refuse la simulation et un fournisseur absent en production, sans révéler de valeur", () => {
    vi.stubEnv("ENVIRONNEMENT", "production");
    vi.stubEnv("FOURNISSEUR_SMS", "simulation");
    expect(() => fournisseurDuCanal("sms")).toThrow(/interdit/);
    vi.stubEnv("FOURNISSEUR_SMS", "");
    expect(() => fournisseurDuCanal("sms")).toThrow(/absent ou inconnu/);
    vi.stubEnv("FOURNISSEUR_EMAIL", "twilio");
    expect(() => fournisseurDuCanal("email")).toThrow(/absent ou inconnu/);
    vi.stubEnv("FOURNISSEUR_SMS", "twilio");
    vi.stubEnv("TWILIO_COMPTE", "ACfictif");
    expect(() => fournisseurDuCanal("sms")).toThrow(/TWILIO_JETON manquante/);
  });

  it("réessaie une fois après un échec temporaire, puis lève une erreur sans destinataire ni texte", async () => {
    vi.stubEnv("ENVIRONNEMENT", "production");
    vi.stubEnv("FOURNISSEUR_EMAIL", "brevo");
    vi.stubEnv("BREVO_CLE", "cle-fictive");
    vi.stubEnv("EMAIL_EXPEDITEUR", "ne-pas-repondre@exemple.invalid");
    const appels: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      appels.push(url);
      return new Response("{}", { status: 503 });
    });
    const envoi = envoyerMessage("parent@exemple.invalid", "Lien secret fictif", "Objet");
    await expect(envoi).rejects.toThrow("Envoi email impossible par brevo (temporaire, 503).");
    await expect(envoi).rejects.not.toThrow(/parent@|Lien secret/);
    expect(appels).toHaveLength(2);
  });
});
