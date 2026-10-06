"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { formaterDuree, formaterUSD } from "@/lib/format";
import { etatTache, soumettre } from "@/lib/serveur/orchestrateur";
import { scriptAProduire } from "@/lib/serveur/production-video";
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

/** Demande de production : passe par l'Orchestrateur (approbation vérifiée en base, file de tâches). */
export async function lancerProductionVideo(
  _etat: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const utilisateur = await exigerReferent();
  const demande = {
    scriptId: String(donnees.get("id") ?? ""),
    version: Number(donnees.get("version")),
    empreinte: String(donnees.get("empreinte") ?? ""),
  };
  const script = await scriptAProduire(utilisateur, demande);
  if (!script) return { erreur: "Script inconnu." };
  const soumission = await soumettre(
    { nature: "production_video", ...demande },
    {
      acteur: { role: "referent", id: utilisateur },
      codePays: script.codePays,
      demandeePar: utilisateur,
      entreesServeur: { ...script },
    },
  );
  if (soumission.statut === "refusee") return { erreur: soumission.motif };
  if (soumission.statut === "question") return { erreur: soumission.question };
  if (soumission.statut !== "en_attente")
    return { erreur: `Production en attente : ${soumission.motif ?? soumission.statut}` };
  revalidatePath(`/referent/scripts/${demande.scriptId}`);

  const tache = await etatTache(soumission.tacheId);
  if (tache?.statut === "terminee") {
    const r = tache.resultat as {
      resultat: string;
      dureeSecondes: number;
      coutUSD: number;
      derniereAnomalie: string | null;
    };
    if (r.resultat === "deposee")
      return {
        succes: `Vidéo produite et déposée « à relire » (${formaterDuree(r.dureeSecondes)}, ${formaterUSD(r.coutUSD)}).`,
      };
    return {
      erreur: `Production ${r.resultat === "refusee" ? "refusée" : "arrêtée"} : ${r.derniereAnomalie ?? "voir le journal"}`,
    };
  }
  if (tache?.statut === "echouee") return { erreur: `Production en échec : ${tache.motif ?? ""}` };
  return {
    succes: "Production demandée : elle sera traitée par la file de tâches. Revenez plus tard.",
  };
}
