import Link from "next/link";
import { redirect } from "next/navigation";
import { roleCompte } from "@/lib/serveur/referent";
import { utilisateurConnecte } from "@/lib/serveur/session";
import { deconnecterMesAppareils } from "./actions";
import { FormulaireSuppression } from "./formulaire-suppression";

const RETOUR: Record<string, [string, string]> = {
  referent: ["/referent", "Espace référent"],
  enseignant: ["/enseignant", "Suivi de ma classe"],
  administrateur: ["/administration", "Administration"],
};

export default async function PageMesDonnees() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  const role = await roleCompte(utilisateur);
  const equipe = role === "referent" || role === "enseignant" || role === "administrateur";
  const [retour, libelleRetour] = RETOUR[role ?? ""] ?? ["/espace", "Mon espace"];
  return (
    <main className="conteneur">
      <p>
        <Link href={retour}>← {libelleRetour}</Link>
      </p>
      <h1>Mes données</h1>
      {equipe ? (
        <p>
          {role === "enseignant"
            ? "Nous gardons le minimum : votre prénom, votre rôle et les classes que vous suivez."
            : "Nous gardons le minimum : votre prénom, votre rôle, les familles que vous validez, vos décisions de validation et les documents que vous avez déposés."}
        </p>
      ) : (
        <p>
          Nous gardons le minimum : ton prénom ou pseudonyme, ta classe, ta série, ton établissement
          si tu l&apos;as donné, ta classe du pilote si tu l&apos;as rejointe, le contact de ton
          parent pour son accord, ta progression et tes échanges avec le professeur.
        </p>
      )}
      <h2>Télécharger mes données</h2>
      <p>
        <a href="/api/mes-donnees" className="bouton" download>
          Télécharger (fichier JSON)
        </a>
      </p>
      <h2>Mes connexions</h2>
      <p>
        {equipe
          ? "Un téléphone perdu ou un ordinateur partagé ? Fermez toutes vos connexions, celle-ci comprise."
          : "Un téléphone perdu ou prêté ? Ferme toutes tes connexions, celle-ci comprise."}
      </p>
      <form action={deconnecterMesAppareils}>
        <button type="submit" className="secondaire">
          Me déconnecter de tous mes appareils
        </button>
      </form>
      <h2>Supprimer mon compte</h2>
      {equipe ? (
        <p>
          {role === "enseignant"
            ? "La suppression de votre compte se fait avec le propriétaire de la plateforme : écrivez-lui depuis la page Aide."
            : "Votre compte porte des validations tracées : sa suppression se fait avec le propriétaire de la plateforme."}
        </p>
      ) : (
        <>
          <p>
            Toutes tes données sont effacées : profil, progression, échanges avec le professeur et
            ton numéro de connexion. C&apos;est définitif. Tu pourras te réinscrire plus tard, en
            repartant de zéro.
          </p>
          <FormulaireSuppression />
        </>
      )}
    </main>
  );
}
