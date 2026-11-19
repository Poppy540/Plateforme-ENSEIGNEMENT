import "server-only";
import { redirect } from "next/navigation";
import { contexteEleve } from "./catalogue";
import { exigerAccesEleves } from "./disponibilite";
import { noterActivite } from "./mes-donnees";
import { utilisateurConnecte } from "./session";

/** Élève connecté, inscrit et dont le compte est actif ; sinon redirection vers l'étape manquante. */
export async function exigerEleveActif(): Promise<string> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  const eleve = await contexteEleve(utilisateur);
  if (!eleve) redirect("/inscription");
  if (eleve.statut !== "actif") redirect("/espace");
  await exigerAccesEleves();
  await noterActivite(utilisateur);
  return utilisateur;
}
