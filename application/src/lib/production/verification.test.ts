import { describe, expect, it } from "vitest";
import { verifierConfiguration } from "./verification";

// Valeurs FICTIVES de test (aucun secret réel).
const COMPLETE = {
  ENVIRONNEMENT: "production",
  URL_PUBLIQUE: "https://plateforme.exemple",
  SECRET_SESSION: "Zq7-vP2!mK9#tR4$wX8&nB3*hL6@jD1^cF5",
  SEL_AUDIT: "sel-fictif-de-test",
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
