import Link from "next/link";
import { redirect } from "next/navigation";
import { masquer } from "@/lib/identifiants";
import { modeAuthentification } from "@/lib/serveur/configuration";
import { identifiantEnCours } from "@/lib/serveur/connexion-en-cours";
import { FormulaireCode } from "./formulaire-code";

export default async function PageCode() {
  const identifiant = await identifiantEnCours();
  if (!identifiant) redirect("/connexion");
  return (
    <main className="conteneur">
      <h1>Entre ton code</h1>
      <p>
        Code envoyé à <strong>{masquer(identifiant)}</strong>. Ne le donne à personne, même pas à
        nous : il se saisit seulement ici.
      </p>
      {modeAuthentification() === "simulation" && (
        <p className="note">
          Mode simulation (développement) : aucun SMS envoyé, le code est 123456.
        </p>
      )}
      <FormulaireCode />
      <p>
        <Link href="/connexion">Changer de numéro</Link>
      </p>
    </main>
  );
}
