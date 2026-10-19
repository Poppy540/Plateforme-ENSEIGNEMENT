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

const HOTES_LOCAUX = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Le mode simulation (codes fixes, messages affichés à l'écran) n'existe qu'en développement et en test, et
 * seulement sur un poste local (revue de sécurité, ADR 0043) : adresse publique locale, ou absente hors d'un
 * serveur compilé pour la production. Un serveur accessible depuis Internet n'est donc jamais en simulation,
 * même si ENVIRONNEMENT est mal renseigné.
 */
export function simulationAutorisee(): boolean {
  if (!["developpement", "test"].includes(environnement())) return false;
  const url = lire("URL_PUBLIQUE");
  if (!url) return process.env.NODE_ENV !== "production";
  try {
    return HOTES_LOCAUX.has(new URL(url).hostname);
  } catch {
    return false;
  }
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

/** Valeur recopiée d'un modèle (« remplacer-moi ») ou secret public de développement : jamais en production. */
function secretDeModele(valeur: string): boolean {
  return /remplacer-moi/i.test(valeur) || valeur === SECRET_DE_DEVELOPPEMENT;
}

/** Secret de signature des sessions. Obligatoire (32 caractères au moins) hors développement et test. */
export function secretSession(): string {
  const secret = lire("SECRET_SESSION");
  if (secret) {
    if (secret.length < 32) throw new Error("SECRET_SESSION doit compter au moins 32 caractères.");
    if (!simulationAutorisee() && (secretDeModele(secret) || new Set(secret).size < 10))
      throw new Error("SECRET_SESSION est une valeur de modèle ou trop peu aléatoire.");
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

/** Sel de pseudonymisation du journal d'audit. Obligatoire hors développement et test. */
export function selAudit(): string {
  const sel = lire("SEL_AUDIT");
  if (sel && !simulationAutorisee() && secretDeModele(sel))
    throw new Error("SEL_AUDIT est une valeur de modèle.");
  if (sel) return sel;
  if (!simulationAutorisee()) throw new Error("SEL_AUDIT manquant.");
  return "sel-d-audit-de-developpement-uniquement";
}

/**
 * Exécution de la file de tâches : « immediat » (développement et test : traitée juste après la demande)
 * ou « file » (production : par l'exécuteur appelé régulièrement, voir /api/orchestrateur/executer).
 */
export function modeFile(): "immediat" | "file" {
  const mode = lire("MODE_FILE") ?? "file";
  if (mode === "immediat") {
    if (!simulationAutorisee())
      throw new Error("MODE_FILE=immediat est interdit hors développement et test.");
    return "immediat";
  }
  return "file";
}

/** Jeton de l'exécuteur de la file (appel planifié) ; absent = exécuteur désactivé. Jamais journalisé. */
export function jetonExecuteur(): string | null {
  const jeton = lire("JETON_EXECUTEUR");
  return jeton && jeton.length >= 32 ? jeton : null;
}

/** Seuil de coût quotidien d'un agent avant suspension automatique (USD). */
export function coutJourMaxUSD(): number {
  const v = Number(lire("COUT_JOUR_MAX_AGENT_USD"));
  return Number.isFinite(v) && v > 0 ? v : 50;
}
