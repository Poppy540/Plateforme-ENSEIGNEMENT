"use server";

import { redirect } from "next/navigation";
import { accepterAccordRapports } from "@/lib/serveur/rapports-parents";

export async function accepterRapports(donnees: FormData): Promise<void> {
  const jeton = String(donnees.get("jeton") ?? "");
  const ok = jeton !== "" && (await accepterAccordRapports(jeton));
  redirect(`/parent/rapports/accord?resultat=${ok ? "accepte" : "invalide"}`);
}
