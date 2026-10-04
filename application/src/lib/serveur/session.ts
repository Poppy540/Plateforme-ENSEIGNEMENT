import "server-only";
import { cookies } from "next/headers";
import { signerSession, verifierSession } from "@/lib/session-signee";
import { environnement, secretSession } from "./configuration";

const NOM = "session";
const DUREE_MS = 30 * 24 * 60 * 60 * 1000;

export async function ouvrirSession(utilisateur: string): Promise<void> {
  const expire = Date.now() + DUREE_MS;
  (await cookies()).set(NOM, signerSession({ utilisateur, expire }, secretSession()), {
    httpOnly: true,
    secure: environnement() === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expire),
  });
}

/** Identifiant de l'utilisateur connecté, ou null. */
export async function utilisateurConnecte(): Promise<string | null> {
  const jeton = (await cookies()).get(NOM)?.value;
  return verifierSession(jeton, secretSession())?.utilisateur ?? null;
}

export async function fermerSession(): Promise<void> {
  (await cookies()).delete(NOM);
}
