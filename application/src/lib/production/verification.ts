// Vérification de la configuration de production (Jalon 5, étape 2 ; ADR 0045), avant toute mise en service.
// Ne renvoie JAMAIS une valeur : seulement le nom de la variable et ce qui manque. Lancée par le propriétaire
// sur le serveur (`pnpm verifier:production`) ; aucune variable n'est lue par Claude Code.

export interface Constat {
  ok: boolean;
  /** Nom de la variable ou du point vérifié, jamais sa valeur. */
  point: string;
  message: string;
}

type Env = Record<string, string | undefined>;

const valeur = (env: Env, nom: string) => env[nom]?.trim() ?? "";
const deModele = (v: string) =>
  /remplacer-moi|secret-de-developpement|sel-d-audit-de-developpement/i.test(v);

export function verifierConfiguration(env: Env): Constat[] {
  const constats: Constat[] = [];
  const exiger = (point: string, ok: boolean, message: string) =>
    constats.push({ ok, point, message });
  const present = (nom: string, message = "à renseigner") => {
    const v = valeur(env, nom);
    exiger(nom, v !== "" && !deModele(v), v === "" ? message : "valeur recopiée du modèle");
  };

  exiger(
    "ENVIRONNEMENT",
    valeur(env, "ENVIRONNEMENT") === "production",
    "doit valoir « production »",
  );
  const url = valeur(env, "URL_PUBLIQUE");
  let urlOk = false;
  try {
    const u = new URL(url);
    urlOk = u.protocol === "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  } catch {
    urlOk = false;
  }
  exiger("URL_PUBLIQUE", urlOk, "adresse publique en https requise");

  const secret = valeur(env, "SECRET_SESSION");
  exiger(
    "SECRET_SESSION",
    secret.length >= 32 && !deModele(secret) && new Set(secret).size >= 10,
    "32 caractères aléatoires au moins, propres à ce serveur",
  );
  present("SEL_AUDIT");
  present("URL_BASE_DONNEES", "connexion du rôle serveur_application");
  exiger(
    "MODE_AUTH",
    (valeur(env, "MODE_AUTH") || "supabase") === "supabase",
    "doit valoir « supabase »",
  );
  present("URL_SUPABASE");
  present("CLE_PUBLIQUE_SUPABASE");
  present("CLE_SERVICE_SUPABASE", "nécessaire à la suppression des comptes");

  exiger(
    "MODE_MODELE",
    (valeur(env, "MODE_MODELE") || "anthropic") === "anthropic",
    "doit valoir « anthropic »",
  );
  present("ANTHROPIC_API_KEY", "clé de l'API Claude, dans l'environnement du serveur seulement");
  exiger("MODE_FILE", (valeur(env, "MODE_FILE") || "file") === "file", "doit valoir « file »");
  exiger(
    "JETON_EXECUTEUR",
    valeur(env, "JETON_EXECUTEUR").length >= 32 && !deModele(valeur(env, "JETON_EXECUTEUR")),
    "32 caractères au moins (sinon l'exécuteur planifié est désactivé)",
  );
  present("CONTACTS_VEILLE", "contacts de l'équipe de veille (alerte de détresse)");

  const sms = valeur(env, "FOURNISSEUR_SMS");
  exiger("FOURNISSEUR_SMS", ["twilio", "http"].includes(sms), "twilio ou http (jamais simulation)");
  if (sms === "twilio")
    ["TWILIO_COMPTE", "TWILIO_JETON", "SMS_EXPEDITEUR"].forEach((n) => present(n));
  const email = valeur(env, "FOURNISSEUR_EMAIL");
  exiger(
    "FOURNISSEUR_EMAIL",
    ["brevo", "http"].includes(email),
    "brevo ou http (jamais simulation)",
  );
  if (email === "brevo") ["BREVO_CLE", "EMAIL_EXPEDITEUR"].forEach((n) => present(n));
  if (sms === "http" || email === "http") {
    present("MESSAGERIE_HTTP_JETON");
    exiger(
      "MESSAGERIE_HTTP_URL",
      valeur(env, "MESSAGERIE_HTTP_URL").startsWith("https://"),
      "adresse https de la passerelle",
    );
  }

  const video = valeur(env, "MODE_VIDEO") || "aucun";
  exiger("MODE_VIDEO", video !== "simulation", "jamais « simulation » en production");
  if (video !== "aucun") {
    const budget = Number(valeur(env, "BUDGET_VIDEO_USD"));
    exiger(
      "BUDGET_VIDEO_USD",
      Number.isFinite(budget) && budget > 0,
      "budget par vidéo, décidé par le propriétaire",
    );
  }
  return constats;
}
