"use server";

import { revalidatePath } from "next/cache";
import { adresseDuSite } from "@/lib/serveur/origine";
import {
  arreterRapports,
  demanderRapportMaintenant,
  questionDuParent,
} from "@/lib/serveur/rapports-parents";

export type EtatParent = { erreur?: string; succes?: string; reponse?: string } | undefined;

export async function demanderMaintenant(
  _etat: EtatParent,
  donnees: FormData,
): Promise<EtatParent> {
  const r = await demanderRapportMaintenant(
    String(donnees.get("jeton") ?? ""),
    await adresseDuSite(),
  );
  return r.ok ? { succes: "Un nouveau rapport vous a été envoyé." } : { erreur: r.erreur };
}

export async function arreter(_etat: EtatParent, donnees: FormData): Promise<EtatParent> {
  const ok = await arreterRapports(String(donnees.get("jeton") ?? ""));
  revalidatePath("/parent/rapport");
  return ok
    ? { succes: "Vous ne recevrez plus de rapports." }
    : { erreur: "Les rapports étaient déjà arrêtés." };
}

export async function poserQuestion(_etat: EtatParent, donnees: FormData): Promise<EtatParent> {
  const r = await questionDuParent(
    String(donnees.get("jeton") ?? ""),
    String(donnees.get("question") ?? ""),
  );
  return r.ok ? { reponse: r.reponse.reponse } : { erreur: r.erreur };
}
