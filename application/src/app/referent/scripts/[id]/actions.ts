"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { formaterDuree, formaterUSD } from "@/lib/format";
import { lancerProduction } from "@/lib/serveur/production-video";
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

export async function lancerProductionVideo(
  _etat: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const utilisateur = await exigerReferent();
  const scriptId = String(donnees.get("id") ?? "");
  const resultat = await lancerProduction(utilisateur, {
    scriptId,
    version: Number(donnees.get("version")),
    empreinte: String(donnees.get("empreinte") ?? ""),
  });
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath(`/referent/scripts/${scriptId}`);
  const r = resultat.rapport;
  if (r.resultat === "deposee")
    return {
      succes: `Vidéo produite et déposée « à relire » (${formaterDuree(r.dureeSecondes)}, ${formaterUSD(r.coutUSD)}).`,
    };
  return {
    erreur: `Production ${r.resultat === "refusee" ? "refusée" : "arrêtée"} : ${r.anomalies.at(-1) ?? "voir le journal"}`,
  };
}
