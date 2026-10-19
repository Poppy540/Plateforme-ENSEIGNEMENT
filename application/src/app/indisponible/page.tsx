import Link from "next/link";
import { redirect } from "next/navigation";
import { seDeconnecter } from "../connexion/actions";
import { FormulaireDeconnexion } from "../composants/hors-ligne";
import { accesElevesOuvert } from "@/lib/serveur/disponibilite";
import { utilisateurConnecte } from "@/lib/serveur/session";

// Accès des élèves fermé par l'administration (ADR 0034) : message neutre, sans motif ; les droits sur les
// données restent exerçables.
export default async function PageIndisponible() {
  // La session est lue d'abord : la page reste dynamique (jamais pré-rendue avec l'état du moment).
  const connecte = (await utilisateurConnecte()) !== null;
  if (await accesElevesOuvert()) redirect("/espace");
  return (
    <main className="conteneur">
      <h1>Momentanément indisponible</h1>
      <p role="status">La plateforme est momentanément indisponible. Merci de revenir plus tard.</p>
      <p>
        <Link href="/aide">Questions fréquentes</Link>
      </p>
      {connecte && (
        <>
          <p>
            <Link href="/espace/mes-donnees">Mes données (télécharger, supprimer mon compte)</Link>
          </p>
          <FormulaireDeconnexion action={seDeconnecter} />
        </>
      )}
      <p className="note">
        Vous êtes enseignant-référent ?{" "}
        <Link href="/referent/activer">Activer votre accès avec votre code</Link>
      </p>
    </main>
  );
}
