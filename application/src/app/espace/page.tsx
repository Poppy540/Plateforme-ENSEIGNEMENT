import Link from "next/link";
import { redirect } from "next/navigation";
import { seDeconnecter } from "../connexion/actions";
import { profilEleve } from "@/lib/serveur/requetes";
import { roleCompte } from "@/lib/serveur/referent";
import { noterActivite } from "@/lib/serveur/mes-donnees";
import { utilisateurConnecte } from "@/lib/serveur/session";

export default async function PageEspace() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  if ((await roleCompte(utilisateur)) === "referent") redirect("/referent");
  const profil = await profilEleve(utilisateur);
  if (!profil) redirect("/inscription");
  await noterActivite(utilisateur);

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
      {profil.statut === "actif" && (
        <>
          <p role="status">Ton compte est actif.</p>
          <p>
            <Link href="/catalogue" className="bouton">
              Mes cours
            </Link>
          </p>
        </>
      )}
      {profil.statut === "suspendu" && (
        <p role="status">Ton compte est suspendu. Contacte le support.</p>
      )}
      <p>
        <Link href="/espace/mes-donnees">Mes données (télécharger, supprimer mon compte)</Link>
      </p>
      <form action={seDeconnecter}>
        <button type="submit" className="secondaire">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
