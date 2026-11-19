import "server-only";
import { cookies } from "next/headers";
import { lireIdentifiant, type Identifiant } from "@/lib/identifiants";
import { simulationAutorisee } from "./configuration";

// Identifiant en attente de code, gardé 10 minutes dans un cookie (jamais dans l'adresse de la page).
const NOM = "connexion_en_cours";

export async function memoriserIdentifiant(identifiant: Identifiant): Promise<void> {
  (await cookies()).set(NOM, JSON.stringify(identifiant), {
    httpOnly: true,
    secure: !simulationAutorisee(),
    sameSite: "lax",
    path: "/connexion",
    maxAge: 10 * 60,
  });
}

export async function identifiantEnCours(): Promise<Identifiant | null> {
  const brut = (await cookies()).get(NOM)?.value;
  if (!brut) return null;
  try {
    return lireIdentifiant((JSON.parse(brut) as Identifiant).valeur);
  } catch {
    return null;
  }
}

export async function oublierIdentifiant(): Promise<void> {
  (await cookies()).delete({ name: NOM, path: "/connexion" });
}
