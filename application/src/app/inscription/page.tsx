import Link from "next/link";
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
      <p className="note">
        Vous êtes enseignant-référent ?{" "}
        <Link href="/referent/activer">Activer votre accès avec votre code</Link>
      </p>
      <p>
        <Link href="/aide">Besoin d&apos;aide pour t&apos;inscrire ?</Link>
      </p>
    </main>
  );
}
