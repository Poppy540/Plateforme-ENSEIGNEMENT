import { redirect } from "next/navigation";
import { roleCompte } from "@/lib/serveur/referent";
import { utilisateurConnecte } from "@/lib/serveur/session";
import { FormulaireActivation } from "./formulaire-activation";

export default async function PageActivationReferent() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  const role = await roleCompte(utilisateur);
  if (role === "referent") redirect("/referent");
  if (role) redirect("/espace");
  return (
    <main className="conteneur">
      <h1>Accès enseignant-référent</h1>
      <p>Saisissez le code d&apos;invitation que l&apos;équipe de la plateforme vous a transmis.</p>
      <FormulaireActivation />
    </main>
  );
}
