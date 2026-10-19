import Link from "next/link";
import { redirect } from "next/navigation";
import { utilisateurConnecte } from "@/lib/serveur/session";
import { EnregistrementHorsLigne } from "../composants/hors-ligne";
import { FormulaireConnexion } from "./formulaire-connexion";

export default async function PageConnexion() {
  if (await utilisateurConnecte()) redirect("/espace");
  return (
    <main className="conteneur">
      {/* Personne déconnectée : les copies hors ligne et les questions en attente sont effacées. */}
      <EnregistrementHorsLigne cle="" />
      <h1>Connexion</h1>
      <p>Tu reçois un code par SMS. Pas de mot de passe à retenir.</p>
      <FormulaireConnexion />
      <p>
        <Link href="/aide">Aide et questions fréquentes</Link>
      </p>
    </main>
  );
}
