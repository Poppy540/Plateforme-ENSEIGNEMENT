import "server-only";
import type { Identifiant } from "@/lib/identifiants";
import { modeAuthentification } from "../configuration";

/** Envoi et vérification d'un code à usage unique (SMS ou email). */
export interface FournisseurAuthentification {
  envoyerCode(identifiant: Identifiant): Promise<void>;
  /** Renvoie l'identifiant du compte si le code est bon, sinon null. */
  verifierCode(identifiant: Identifiant, code: string): Promise<string | null>;
}

export async function fournisseurAuthentification(): Promise<FournisseurAuthentification> {
  if (modeAuthentification() === "simulation") {
    return (await import("./simulation")).fournisseurSimule;
  }
  return (await import("./supabase")).fournisseurSupabase;
}
