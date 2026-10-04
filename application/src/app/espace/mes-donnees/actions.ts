"use server";

import { redirect } from "next/navigation";
import { fournisseurAuthentification } from "@/lib/serveur/authentification/fournisseur";
import { roleCompte } from "@/lib/serveur/referent";
import { fermerSession, utilisateurConnecte } from "@/lib/serveur/session";

export type EtatSuppression = { erreur?: string } | undefined;

export async function supprimerMonCompte(
  _etat: EtatSuppression,
  donnees: FormData,
): Promise<EtatSuppression> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  if (
    String(donnees.get("confirmation") ?? "")
      .trim()
      .toUpperCase() !== "SUPPRIMER"
  ) {
    return { erreur: "Écris SUPPRIMER pour confirmer." };
  }
  // Les comptes d'enseignants-référents portent des validations tracées : leur suppression passe par l'équipe.
  const role = await roleCompte(utilisateur);
  if (role !== null && role !== "eleve") {
    return {
      erreur: "La suppression de ce type de compte se fait avec l'équipe de la plateforme.",
    };
  }
  await (await fournisseurAuthentification()).supprimerCompte(utilisateur);
  console.info(JSON.stringify({ evenement: "compte_supprime_par_son_titulaire" }));
  await fermerSession();
  redirect("/?compte=supprime");
}
