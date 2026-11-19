// Messages passés dans l'adresse après une action (revue du Jalon 24, S22) : « ?erreur=… » ou « ?ok=… » ne
// s'affichent que s'ils portent la signature du serveur. Un lien fabriqué ne peut plus faire afficher un faux
// message (« appelez le … ») à un administrateur ou un référent connecté. Fonctions pures.
import { createHmac, timingSafeEqual } from "node:crypto";

export interface Message {
  erreur?: string | null;
  ok?: string | null;
}

const LONGUEUR = { erreur: 200, ok: 120 } as const;

function signature(type: "erreur" | "ok", texte: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`message:${type}:${texte}`)
    .digest("base64url")
    .slice(0, 22);
}

/** Paramètres d'adresse d'un message (erreur prioritaire), avec sa signature `s`. */
export function parametresMessage(message: Message, secret: string): Record<string, string> {
  const type = message.erreur ? "erreur" : "ok";
  const texte = (message.erreur || message.ok || "").slice(0, LONGUEUR[type]);
  if (!texte) return {};
  return { [type]: texte, s: signature(type, texte, secret) };
}

/** Message lu dans l'adresse : seulement s'il est signé par le serveur, sinon rien. */
export function lireMessage(
  parametres: Record<string, string | string[] | undefined>,
  secret: string,
): { erreur: string | null; ok: string | null } {
  const signee = typeof parametres.s === "string" ? Buffer.from(parametres.s) : null;
  const valide = (type: "erreur" | "ok") => {
    const texte = parametres[type];
    if (typeof texte !== "string" || !signee || texte.length > LONGUEUR[type]) return null;
    const attendue = Buffer.from(signature(type, texte, secret));
    return attendue.length === signee.length && timingSafeEqual(attendue, signee) ? texte : null;
  };
  return { erreur: valide("erreur"), ok: valide("ok") };
}
