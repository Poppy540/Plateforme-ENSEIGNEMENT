import Link from "next/link";
import { identite } from "@/lib/identite";

export default function Accueil() {
  return (
    <main className="conteneur">
      <h1>{identite.nom}</h1>
      <p>{identite.description}</p>
      <p>
        <Link href="/connexion" className="bouton">
          Se connecter ou s&apos;inscrire
        </Link>
      </p>
      <p className="note">Version de développement : données fictives uniquement.</p>
    </main>
  );
}
