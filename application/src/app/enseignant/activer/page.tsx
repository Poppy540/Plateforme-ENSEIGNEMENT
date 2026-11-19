import { redirect } from "next/navigation";
import { roleCompte } from "@/lib/serveur/referent";
import { utilisateurConnecte } from "@/lib/serveur/session";
import { FormulaireActivation } from "./formulaire-activation";

export default async function PageActivationEnseignant() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  const role = await roleCompte(utilisateur);
  if (role && role !== "enseignant") redirect("/espace");
  return (
    <main className="conteneur">
      <h1>Accès enseignant de la classe</h1>
      <p>
        Saisissez le code d&apos;invitation personnel que l&apos;équipe de la plateforme vous a
        transmis. Si vous suivez déjà une classe, ce code en ajoute une autre.
      </p>
      <FormulaireActivation />
    </main>
  );
}
