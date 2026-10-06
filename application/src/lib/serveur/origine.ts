import "server-only";
import { headers } from "next/headers";
import { urlPublique } from "./configuration";

/** Adresse publique du site pour les liens envoyés (URL_PUBLIQUE ; en développement, l'origine de la requête). */
export async function adresseDuSite(): Promise<string> {
  const entetes = await headers();
  const origine = entetes.get("host")
    ? `${entetes.get("x-forwarded-proto") ?? "http"}://${entetes.get("host")}`
    : null;
  return urlPublique(origine);
}
