// Journal du serveur sans donnée personnelle (Jalon 7, étape 3 ; ADR 0056 ; condition 6 du pilote). Une ligne JSON par
// événement : horodatage, niveau, nom d'événement, quelques champs courts. Tout texte est nettoyé avant d'être écrit
// (numéros, emails, liens et adresses de connexion, identifiants, jetons, en-têtes d'autorisation). Les erreurs
// peuvent en plus partir vers un service de surveillance (JOURNAL_HTTP_URL), en https, avec un jeton.
import { masquerDonneesSensibles } from "./agents/masquage.ts";

export type Niveau = "info" | "avertissement" | "erreur";
type Valeur = string | number | boolean | null | undefined | string[];

const LONGUEUR_MAX = 500;

/** Retire d'un texte tout ce qui pourrait désigner une personne ou ouvrir un accès. */
export function nettoyer(texte: string): string {
  const sans = texte
    // Adresses de connexion (postgresql://utilisateur:mot-de-passe@hôte…) et liens de tout protocole.
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, "[adresse masquée]")
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/g, "$1 [masqué]")
    // Jetons JWT, identifiants (UUID), jetons et empreintes hexadécimales, clés longues.
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[jeton masqué]")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      "[identifiant masqué]",
    )
    .replace(/\b[0-9a-f]{24,}\b/gi, "[jeton masqué]")
    .replace(/\b(sk|pk|ak|rk)[-_][A-Za-z0-9_-]{16,}/g, "[clé masquée]");
  return masquerDonneesSensibles(sans);
}

/** Empreinte d'erreur produite par Next.js (nombre) : ne désigne personne, gardée telle quelle pour l'enquête. */
const EMPREINTE = /^\d{1,20}$/;

function champ(v: Valeur, cle = ""): Valeur {
  if (cle === "empreinte" && typeof v === "string" && EMPREINTE.test(v)) return v;
  if (typeof v === "string") return nettoyer(v).slice(0, LONGUEUR_MAX);
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => nettoyer(String(x)).slice(0, 100));
  return v;
}

/** Ligne de journal (JSON), déjà nettoyée. */
export function ligneJournal(
  niveau: Niveau,
  evenement: string,
  champs: Record<string, Valeur> = {},
  maintenant = new Date(),
): string {
  const propres: Record<string, Valeur> = {};
  for (const [cle, valeur] of Object.entries(champs))
    if (valeur !== undefined) propres[cle] = champ(valeur, cle);
  return JSON.stringify({
    horodatage: maintenant.toISOString(),
    niveau,
    evenement: nettoyer(evenement).slice(0, 80),
    ...propres,
  });
}

type Envoi = (ligne: string) => Promise<void>;

/** Envoi vers un service de surveillance (erreurs seulement), si configuré ; jamais bloquant ni répété. */
export function envoiSurveillance(
  env: Record<string, string | undefined> = process.env,
  fetchFn: typeof fetch = fetch,
): Envoi | null {
  const url = env.JOURNAL_HTTP_URL?.trim();
  const jeton = env.JOURNAL_HTTP_JETON?.trim();
  if (!url || !jeton || !url.startsWith("https://")) return null;
  return async (ligne) => {
    try {
      await fetchFn(url, {
        method: "POST",
        headers: { authorization: `Bearer ${jeton}`, "content-type": "application/json" },
        body: ligne,
        signal: AbortSignal.timeout(3_000),
      });
    } catch {
      // Le service de surveillance indisponible ne doit jamais faire échouer une requête.
    }
  };
}

/**
 * Écrit un événement (sortie standard ; erreur sur la sortie d'erreur) et, pour une erreur, l'envoie au service
 * de surveillance s'il est configuré. Rien d'autre que le nom de l'événement et les champs fournis.
 */
export async function journaliser(
  niveau: Niveau,
  evenement: string,
  champs: Record<string, Valeur> = {},
): Promise<void> {
  const ligne = ligneJournal(niveau, evenement, champs);
  ecrireBrut(niveau, ligne);
  if (niveau === "erreur") await envoiSurveillance()?.(ligne);
}

// Écriture directe (non nettoyée une seconde fois) : la console est elle-même nettoyée par l'instrumentation.
const ecritures = {
  info: (l: string) => process.stdout.write(`${l}\n`),
  avertissement: (l: string) => process.stderr.write(`${l}\n`),
  erreur: (l: string) => process.stderr.write(`${l}\n`),
};
function ecrireBrut(niveau: Niveau, ligne: string) {
  ecritures[niveau](ligne);
}

/** Texte nettoyé d'une valeur quelconque passée à la console (y compris une erreur et sa pile). */
export function texteNettoye(valeur: unknown): string {
  if (valeur instanceof Error)
    return nettoyer(`${valeur.name}: ${valeur.message}${valeur.stack ? `\n${valeur.stack}` : ""}`);
  if (typeof valeur === "string") return nettoyer(valeur);
  try {
    return nettoyer(JSON.stringify(valeur) ?? String(valeur));
  } catch {
    return "[valeur non affichable]";
  }
}

/**
 * Toute sortie de la console du serveur (Next.js compris) passe par le nettoyage : une erreur de base de données ou
 * d'un fournisseur qui citerait un numéro, un email ou un jeton n'atteint jamais les journaux de l'hébergeur.
 */
export function installerNettoyageConsole(c: Console = console): void {
  const marque = c as Console & { __nettoyee?: boolean };
  if (marque.__nettoyee) return;
  marque.__nettoyee = true;
  for (const methode of ["log", "info", "warn", "error", "debug"] as const) {
    const origine = c[methode].bind(c);
    c[methode] = (...args: unknown[]) => origine(args.map(texteNettoye).join(" "));
  }
}
