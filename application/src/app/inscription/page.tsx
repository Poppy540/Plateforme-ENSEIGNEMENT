import { redirect } from "next/navigation";
import { aUnProfil, optionsInscription } from "@/lib/serveur/requetes";
import { utilisateurConnecte } from "@/lib/serveur/session";
import { FormulaireInscription } from "./formulaire-inscription";

export default async function PageInscription() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  if (await aUnProfil(utilisateur)) redirect("/espace");
  return (
    <main className="conteneur">
      <h1>Inscription</h1>
      <p>Nous demandons le minimum : pas de nom de famille, pas d&apos;adresse.</p>
      <FormulaireInscription options={await optionsInscription()} />
    </main>
  );
}
