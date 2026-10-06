import Link from "next/link";
import { identite } from "@/lib/identite";

export default async function Accueil({ searchParams }: PageProps<"/">) {
  const { compte } = await searchParams;
  return (
    <main className="conteneur">
      {compte === "supprime" && (
        <p role="status" className="attente">
          Ton compte et toutes tes données ont été supprimés.
        </p>
      )}
      <h1>{identite.nom}</h1>
      <p>{identite.description}</p>
      <p>
        <Link href="/connexion" className="bouton">
          Se connecter ou s&apos;inscrire
        </Link>
      </p>
      <p>
        <Link href="/aide">Aide et questions fréquentes</Link>
      </p>
      <p className="note">Version de développement : données fictives uniquement.</p>
    </main>
  );
}
