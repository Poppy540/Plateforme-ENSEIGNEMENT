"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { deciderScript, genererBrouillonScript } from "@/lib/serveur/scenariste";
import { lireDecision } from "../../decision";
import type { EtatFormulaire } from "../../formulaires-contenu";

export async function deciderSurScript(
  _etat: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const utilisateur = await exigerReferent();
  const decision = lireDecision(donnees);
  if ("erreur" in decision) return decision;
  const resultat = await deciderScript(utilisateur, decision);
  if (!resultat.ok) return { erreur: resultat.erreur };
  // La page est recalculée : elle affiche le nouveau statut et la décision dans l'historique.
  revalidatePath(`/referent/scripts/${decision.id}`);
  return undefined;
}

export async function demanderRevision(
  _etat: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const utilisateur = await exigerReferent();
  const id = String(donnees.get("id") ?? "");
  const chapitreId = String(donnees.get("chapitre") ?? "");
  const resultat = await genererBrouillonScript(utilisateur, {
    chapitreId,
    dureeMinutes: Number(donnees.get("duree")),
    consigne: String(donnees.get("consigne") ?? "").trim() || null,
    revisionDe: id,
  });
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath(`/referent/chapitres/${chapitreId}`);
  redirect(`/referent/chapitres/${chapitreId}?revision=${resultat.version}`);
}
