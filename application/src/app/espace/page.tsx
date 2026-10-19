import Link from "next/link";
import { redirect } from "next/navigation";
import { seDeconnecter } from "../connexion/actions";
import { EnregistrementHorsLigne, FormulaireDeconnexion } from "../composants/hors-ligne";
import { cleHorsLigne } from "@/lib/serveur/cle-hors-ligne";
import { profilEleve } from "@/lib/serveur/requetes";
import { roleCompte } from "@/lib/serveur/referent";
import { exigerAccesEleves } from "@/lib/serveur/disponibilite";
import { noterActivite } from "@/lib/serveur/mes-donnees";
import { utilisateurConnecte } from "@/lib/serveur/session";

export default async function PageEspace() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  const role = await roleCompte(utilisateur);
  if (role === "referent") redirect("/referent");
  if (role === "administrateur") redirect("/administration");
  const profil = await profilEleve(utilisateur);
  if (!profil) redirect("/inscription");
  await exigerAccesEleves();
  await noterActivite(utilisateur);

  return (
    <main className="conteneur">
      <EnregistrementHorsLigne cle={cleHorsLigne(utilisateur)} />
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
          <p>
            <Link href="/espace/plan">Mon plan de révision</Link>
          </p>
        </>
      )}
      {profil.statut === "suspendu" && (
        <p role="status">Ton compte est suspendu. Contacte le support depuis la page Aide.</p>
      )}
      <p>
        <Link href="/espace/mes-donnees">Mes données (télécharger, supprimer mon compte)</Link>
      </p>
      <p>
        <Link href="/aide">Aide</Link>
      </p>
      <FormulaireDeconnexion action={seDeconnecter} />
    </main>
  );
}
