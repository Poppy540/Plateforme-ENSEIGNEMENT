import { redirect } from "next/navigation";
import { seDeconnecter } from "../connexion/actions";
import { profilEleve } from "@/lib/serveur/requetes";
import { utilisateurConnecte } from "@/lib/serveur/session";

export default async function PageEspace() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  const profil = await profilEleve(utilisateur);
  if (!profil) redirect("/inscription");

  return (
    <main className="conteneur">
      <h1>Bonjour {profil.prenom}</h1>
      <p>
        Classe : <strong>{profil.niveau}</strong>
        {profil.serie && (
          <>
            {" "}
            — série <strong>{profil.serie}</strong>
          </>
        )}
      </p>
      {profil.statut === "en_attente_parent" && (
        <p role="status" className="attente">
          Ton inscription attend l&apos;accord de ton parent ou tuteur. Il a reçu un lien : dès
          qu&apos;il l&apos;ouvre et accepte, ton compte s&apos;active.
        </p>
      )}
      {profil.statut === "actif" && <p role="status">Ton compte est actif.</p>}
      {profil.statut === "suspendu" && (
        <p role="status">Ton compte est suspendu. Contacte le support.</p>
      )}
      <form action={seDeconnecter}>
        <button type="submit" className="secondaire">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
