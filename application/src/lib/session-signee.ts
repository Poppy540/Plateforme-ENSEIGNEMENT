// Jeton de session signé (HMAC-SHA256) : identifiant de l'utilisateur et date d'expiration.
// Fonctions pures, sans dépendance au serveur web, pour pouvoir les tester.
import { createHmac, timingSafeEqual } from "node:crypto";

export interface ContenuSession {
  utilisateur: string;
  expire: number; // millisecondes depuis l'époque Unix
}

function signature(donnees: string, secret: string): string {
  return createHmac("sha256", secret).update(donnees).digest("base64url");
}

export function signerSession(contenu: ContenuSession, secret: string): string {
  const donnees = Buffer.from(JSON.stringify(contenu)).toString("base64url");
  return `${donnees}.${signature(donnees, secret)}`;
}

export function verifierSession(
  jeton: string | undefined,
  secret: string,
  maintenant = Date.now(),
): ContenuSession | null {
  if (!jeton) return null;
  const [donnees, signee] = jeton.split(".");
  if (!donnees || !signee) return null;
  const attendue = Buffer.from(signature(donnees, secret));
  const recue = Buffer.from(signee);
  if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) return null;
  try {
    const contenu = JSON.parse(
      Buffer.from(donnees, "base64url").toString("utf8"),
    ) as ContenuSession;
    if (typeof contenu.utilisateur !== "string" || typeof contenu.expire !== "number") return null;
    return contenu.expire > maintenant ? contenu : null;
  } catch {
    return null;
  }
}
