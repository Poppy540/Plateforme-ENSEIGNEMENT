import "server-only";
import { redirect } from "next/navigation";
import { roleCompte } from "./referent";
import { utilisateurConnecte } from "./session";

export async function exigerReferent(): Promise<string> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  if ((await roleCompte(utilisateur)) !== "referent") redirect("/espace");
  return utilisateur;
}
