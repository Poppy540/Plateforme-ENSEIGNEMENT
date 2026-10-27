"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { quitterClasse, rejoindreClasse } from "@/lib/serveur/classes";
import { utilisateurConnecte } from "@/lib/serveur/session";

export type EtatClasse = { erreur?: string } | undefined;

export async function rejoindre(_etat: EtatClasse, donnees: FormData): Promise<EtatClasse> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  const code = String(donnees.get("code_classe") ?? "").trim();
  if (!code) return { erreur: "Saisis le code donné par ton enseignant." };
  const erreur = await rejoindreClasse(utilisateur, code.slice(0, 40));
  if (erreur) return { erreur };
  revalidatePath("/espace");
  return undefined;
}

export async function quitter(): Promise<void> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  await quitterClasse(utilisateur);
  revalidatePath("/espace");
}
