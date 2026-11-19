import "server-only";
import { redirect } from "next/navigation";
import { roleCompte } from "./referent";
import { utilisateurConnecte } from "./session";

export async function exigerAdministrateur(): Promise<string> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  if ((await roleCompte(utilisateur)) !== "administrateur") redirect("/espace");
  return utilisateur;
}
