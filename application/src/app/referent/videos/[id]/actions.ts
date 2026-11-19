"use server";

import { revalidatePath } from "next/cache";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { deciderVideo, publierVideo } from "@/lib/serveur/videos";
import { lireDecision } from "../../decision";
import type { EtatFormulaire } from "../../formulaires-contenu";

export async function deciderSurVideo(
  _etat: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const utilisateur = await exigerReferent();
  const decision = lireDecision(donnees);
  if ("erreur" in decision) return decision;
  const resultat = await deciderVideo(utilisateur, decision);
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath(`/referent/videos/${decision.id}`);
  return undefined;
}

export async function publier(_etat: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const utilisateur = await exigerReferent();
  const id = String(donnees.get("id") ?? "");
  if (donnees.get("confirmation") !== "oui")
    return { erreur: "Cochez la case pour confirmer la publication aux élèves." };
  const resultat = await publierVideo(utilisateur, id);
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath(`/referent/videos/${id}`);
  return undefined;
}
