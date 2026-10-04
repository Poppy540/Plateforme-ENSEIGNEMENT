"use server";

import { redirect } from "next/navigation";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { deciderChapitre } from "@/lib/serveur/referent";

export type EtatDecision = { erreur?: string } | undefined;

export async function decider(_etat: EtatDecision, donnees: FormData): Promise<EtatDecision> {
  const utilisateur = await exigerReferent();
  const id = String(donnees.get("id") ?? "");
  const version = Number(donnees.get("version"));
  const choix = String(donnees.get("decision") ?? "");
  const commentaire = String(donnees.get("commentaire") ?? "").trim() || null;

  if (choix !== "valide" && choix !== "rejete")
    return { erreur: "Choisissez de valider ou de rejeter." };
  if (!Number.isInteger(version)) return { erreur: "Version manquante : rechargez la page." };
  if (choix === "rejete" && !commentaire)
    return { erreur: "Expliquez ce qu'il faut corriger en cas de rejet." };
  if (commentaire && commentaire.length > 2000)
    return { erreur: "Commentaire trop long (2000 caractères au plus)." };

  const resultat = await deciderChapitre(utilisateur, {
    id,
    decision: choix,
    version,
    commentaire,
  });
  if (!resultat.ok) return { erreur: resultat.erreur };
  redirect("/referent");
}
