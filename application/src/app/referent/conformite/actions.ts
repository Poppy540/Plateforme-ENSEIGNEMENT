"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { cloreRapportConformite, demanderAnalyse } from "@/lib/serveur/conformite";

export type EtatConformite = { erreur?: string; succes?: string } | undefined;

export async function analyser(_etat: EtatConformite, donnees: FormData): Promise<EtatConformite> {
  const referent = await exigerReferent();
  const resultat = await demanderAnalyse(
    referent,
    String(donnees.get("document") ?? ""),
    String(donnees.get("unite") ?? ""),
    String(donnees.get("consigne") ?? "").trim() || null,
  );
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath("/referent/conformite");
  if (resultat.rapportId) redirect(`/referent/conformite/${resultat.rapportId}`);
  return { succes: resultat.message };
}

export async function clore(donnees: FormData): Promise<void> {
  const referent = await exigerReferent();
  const id = String(donnees.get("rapport") ?? "");
  await cloreRapportConformite(referent, id);
  revalidatePath(`/referent/conformite/${id}`);
}
