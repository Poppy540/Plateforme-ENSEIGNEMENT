import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerEleveActif } from "@/lib/serveur/acces-eleve";
import { catalogue } from "@/lib/serveur/catalogue";

export default async function PageCatalogue({ searchParams }: PageProps<"/catalogue">) {
  const utilisateur = await exigerEleveActif();
  const { niveau, serie } = await searchParams;
  const page = await catalogue(utilisateur, {
    niveau: typeof niveau === "string" ? niveau : undefined,
    serie: typeof serie === "string" ? serie : undefined,
  });
  if (!page) notFound();

  return (
    <main className="conteneur">
      <p>
        <Link href="/espace">← Mon espace</Link>
      </p>
      <h1>
        {page.estSaClasse ? "Mes cours" : "Cours"} — {page.niveau.libelle}
        {page.serie && ` ${page.serie}`}
      </h1>

      {page.unites.length === 0 && <p>Aucune matière pour cette classe.</p>}
      <ul className="liste-cartes">
        {page.unites.map((u) => (
          <li key={u.code}>
            {u.chapitresDisponibles > 0 ? (
              <Link href={`/catalogue/${u.code}`} className="carte">
                <strong>{u.matiere}</strong>
                <span>
                  {u.chapitresTermines} / {u.chapitresDisponibles} chapitres terminés
                </span>
              </Link>
            ) : (
              <div className="carte inactive">
                <strong>{u.matiere}</strong>
                <span>Bientôt disponible</span>
              </div>
            )}
          </li>
        ))}
      </ul>

      <details className="autres-classes">
        <summary>Parcourir une autre classe</summary>
        <form method="get" className="formulaire">
          <label htmlFor="niveau">Classe</label>
          <select id="niveau" name="niveau" defaultValue={page.niveau.code}>
            {page.niveaux.map((n) => (
              <option key={n.code} value={n.code}>
                {n.libelle}
              </option>
            ))}
          </select>
          <label htmlFor="serie">Série (classes à séries)</label>
          <select id="serie" name="serie" defaultValue={page.serie ?? ""}>
            <option value="">Toutes</option>
            {page.series.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.libelle}
              </option>
            ))}
          </select>
          <button type="submit">Afficher</button>
        </form>
        {!page.estSaClasse && (
          <p>
            <Link href="/catalogue">Revenir à ma classe</Link>
          </p>
        )}
      </details>
    </main>
  );
}
