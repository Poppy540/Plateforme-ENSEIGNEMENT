import "server-only";

// Configuration lue dans l'environnement. Aucune valeur secrète dans le dépôt (secrets/README.md).
export type ModeAuthentification = "simulation" | "supabase";

function lire(nom: string): string | undefined {
  const valeur = process.env[nom];
  return valeur && valeur.trim() !== "" ? valeur.trim() : undefined;
}

/** Environnement déclaré ; en l'absence d'indication, on se comporte comme en production (sécurité). */
export function environnement(): string {
  return lire("ENVIRONNEMENT") ?? "production";
}

/** Le mode simulation (codes fixes, messages affichés à l'écran) n'existe qu'en développement et en test. */
export function simulationAutorisee(): boolean {
  return ["developpement", "test"].includes(environnement());
}

export function modeAuthentification(): ModeAuthentification {
  const mode = lire("MODE_AUTH") ?? "supabase";
  if (mode === "simulation") {
    if (!simulationAutorisee()) {
      throw new Error("MODE_AUTH=simulation est interdit hors développement et test.");
    }
    return "simulation";
  }
  if (mode !== "supabase") throw new Error(`MODE_AUTH inconnu : ${mode}`);
  return "supabase";
}

export function urlBaseDeDonnees(): string {
  const url = lire("URL_BASE_DONNEES");
  if (!url) throw new Error("URL_BASE_DONNEES manquante.");
  return url;
}

// Développement et test uniquement (jamais accepté en production, voir plus bas) : un secret fixe, pour que
// toutes les parties du serveur (pages, routes d'API) vérifient les mêmes sessions.
const SECRET_DE_DEVELOPPEMENT = "secret-de-developpement-uniquement-jamais-en-production";

/** Secret de signature des sessions. Obligatoire (32 caractères au moins) hors développement et test. */
export function secretSession(): string {
  const secret = lire("SECRET_SESSION");
  if (secret) {
    if (secret.length < 32) throw new Error("SECRET_SESSION doit compter au moins 32 caractères.");
    return secret;
  }
  if (!simulationAutorisee()) throw new Error("SECRET_SESSION manquant.");
  return SECRET_DE_DEVELOPPEMENT;
}

export function configurationSupabase(): { url: string; clePublique: string } {
  const url = lire("URL_SUPABASE");
  const clePublique = lire("CLE_PUBLIQUE_SUPABASE");
  if (!url || !clePublique) throw new Error("URL_SUPABASE ou CLE_PUBLIQUE_SUPABASE manquante.");
  return { url, clePublique };
}

/** Clé de service Supabase (administration des comptes : suppression). Serveur uniquement, jamais aux agents. */
export function cleServiceSupabase(): string {
  const cle = lire("CLE_SERVICE_SUPABASE");
  if (!cle) throw new Error("CLE_SERVICE_SUPABASE manquante.");
  return cle;
}

/** Adresse publique de l'application (liens envoyés par message). Obligatoire hors développement. */
export function urlPublique(origineRequete: string | null): string {
  const url = lire("URL_PUBLIQUE");
  if (url) return url.replace(/\/$/, "");
  if (simulationAutorisee() && origineRequete) return origineRequete;
  throw new Error("URL_PUBLIQUE manquante.");
}
