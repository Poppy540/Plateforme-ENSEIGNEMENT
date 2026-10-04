import Link from "next/link";
import { seDeconnecter } from "../connexion/actions";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { tableauReferent } from "@/lib/serveur/referent";

const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" });

export default async function PageReferent() {
  const utilisateur = await exigerReferent();
  const tableau = await tableauReferent(utilisateur);

  return (
    <main className="conteneur">
      <h1>Espace enseignant-référent</h1>
      <p>
        Bonjour {tableau.prenom}. Familles de matières :{" "}
        <strong>{tableau.familles.join(", ")}</strong>.
      </p>
      <p className="note">
        Rien n&apos;est montré aux élèves sans votre validation. Une validation porte sur la version
        que vous avez lue : si le chapitre change, il revient ici.
      </p>

      <h2>À valider ({tableau.aValider.length})</h2>
      {tableau.aValider.length === 0 && <p>Aucun chapitre en attente.</p>}
      <ul className="liste-cartes">
        {tableau.aValider.map((c) => (
          <li key={c.id}>
            <Link href={`/referent/chapitres/${c.id}`} className="carte">
              <span className="note">
                {c.matiere} — {c.niveau}
                {c.series.length > 0 && ` ${c.series.join("/")}`} · chapitre {c.ordre} · version{" "}
                {c.version}
              </span>
              <strong>{c.titre}</strong>
            </Link>
          </li>
        ))}
      </ul>

      {tableau.decisionsRecentes.length > 0 && (
        <>
          <h2>Mes dernières décisions</h2>
          <ul>
            {tableau.decisionsRecentes.map((d) => (
              <li key={`${d.unite}-${d.titre}-${d.decideLe}`}>
                {d.decision === "valide" ? "Validé" : "Rejeté"} : {d.titre} ({d.unite}) —{" "}
                {formatDate.format(new Date(d.decideLe))}
              </li>
            ))}
          </ul>
        </>
      )}

      <form action={seDeconnecter}>
        <button type="submit" className="secondaire">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
