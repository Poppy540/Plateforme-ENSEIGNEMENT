"use server";

import { redirect } from "next/navigation";
import { activerEnseignant } from "@/lib/serveur/classes";
import { utilisateurConnecte } from "@/lib/serveur/session";

export type EtatActivation = { erreur?: string; prenom?: string } | undefined;

export async function activer(_etat: EtatActivation, donnees: FormData): Promise<EtatActivation> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  const code = String(donnees.get("code") ?? "").trim();
  const prenom = String(donnees.get("prenom") ?? "").trim();
  if (!code) return { erreur: "Saisissez le code d'invitation reçu.", prenom };
  if (prenom.length > 40)
    return { erreur: "Prénom ou pseudonyme : 40 caractères au plus.", prenom };
  const erreur = await activerEnseignant(utilisateur, code, prenom);
  if (erreur) return { erreur, prenom };
  redirect("/enseignant");
}
