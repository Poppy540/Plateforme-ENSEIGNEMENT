import Link from "next/link";
import { redirect } from "next/navigation";
import { utilisateurConnecte } from "@/lib/serveur/session";
import { FormulaireSuppression } from "./formulaire-suppression";

export default async function PageMesDonnees() {
  if (!(await utilisateurConnecte())) redirect("/connexion");
  return (
    <main className="conteneur">
      <p>
        <Link href="/espace">← Mon espace</Link>
      </p>
      <h1>Mes données</h1>
      <p>
        Nous gardons le minimum : ton prénom ou pseudonyme, ta classe, ta série, ton établissement
        si tu l&apos;as donné, le contact de ton parent pour son accord, ta progression et tes
        échanges avec le professeur.
      </p>
      <h2>Télécharger mes données</h2>
      <p>
        <a href="/api/mes-donnees" className="bouton" download>
          Télécharger (fichier JSON)
        </a>
      </p>
      <h2>Supprimer mon compte</h2>
      <p>
        Toutes tes données sont effacées : profil, progression, échanges avec le professeur et ton
        numéro de connexion. C&apos;est définitif. Tu pourras te réinscrire plus tard, en repartant
        de zéro.
      </p>
      <FormulaireSuppression />
    </main>
  );
}
