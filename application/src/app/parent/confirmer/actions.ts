"use server";

import { redirect } from "next/navigation";
import { confirmerParent } from "@/lib/serveur/requetes";

export async function accepterInscription(donnees: FormData): Promise<void> {
  const jeton = String(donnees.get("jeton") ?? "");
  const ok = jeton !== "" && (await confirmerParent(jeton));
  redirect(`/parent/confirmer?resultat=${ok ? "accepte" : "invalide"}`);
}
