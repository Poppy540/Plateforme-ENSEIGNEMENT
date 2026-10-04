import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerEleveActif } from "@/lib/serveur/acces-eleve";
import { unite } from "@/lib/serveur/catalogue";

const LIBELLES_STATUT = { a_voir: "À voir", en_cours: "En cours", termine: "Terminé" } as const;

export default async function PageUnite({ params }: PageProps<"/catalogue/[unite]">) {
  const utilisateur = await exigerEleveActif();
  const { unite: code } = await params;
  const page = await unite(utilisateur, code);
  if (!page) notFound();

  return (
    <main className="conteneur">
      <p>
        <Link href="/catalogue">← Mes cours</Link>
      </p>
      <h1>
        {page.matiere} — {page.niveau}
        {page.series.length > 0 && ` ${page.series.join("/")}`}
      </h1>
      {page.chapitres.length === 0 && (
        <p>Les chapitres de cette matière sont en cours de validation.</p>
      )}
      <ol className="chapitres">
        {page.chapitres.map((c) => (
          <li key={c.code}>
            <div>
              <strong>{c.titre}</strong>
              {c.sousThemes.length > 0 && <p className="note">{c.sousThemes.join(" · ")}</p>}
            </div>
            <span className={`statut statut-${c.statut}`}>{LIBELLES_STATUT[c.statut]}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
