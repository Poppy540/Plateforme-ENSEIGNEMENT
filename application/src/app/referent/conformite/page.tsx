import Link from "next/link";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { espaceConformite } from "@/lib/serveur/conformite";
import { FormulaireAnalyse } from "./formulaire-analyse";

const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" });

// Conformité programme (ADR 0039) : dépôt de documents officiels et rapports d'écart (brouillons).
export default async function PageConformite({ searchParams }: PageProps<"/referent/conformite">) {
  const referent = await exigerReferent();
  const { documents, unites, rapports } = await espaceConformite(referent);
  const { erreur, depot } = await searchParams;

  return (
    <main className="conteneur">
      <p>
        <Link href="/referent">← Espace référent</Link>
      </p>
      <h1>Conformité au programme officiel</h1>
      <p className="note">
        L&apos;agent Conformité (une intelligence artificielle) extrait la structure d&apos;un
        document officiel et la compare au programme de la plateforme. Ses rapports sont des
        recommandations : rien ne change dans le référentiel sans votre validation.
      </p>

      <h2>Déposer un document</h2>
      {typeof erreur === "string" && (
        <p role="alert" className="erreur">
          {erreur}
        </p>
      )}
      {depot === "ok" && <p role="status">Document déposé.</p>}
      <form
        method="post"
        action="/api/conformite/documents"
        encType="multipart/form-data"
        className="formulaire"
      >
        <label htmlFor="titre">Titre du document</label>
        <input id="titre" name="titre" required maxLength={200} />
        <label htmlFor="origine">Origine (organisme, référence ou lien)</label>
        <input id="origine" name="origine" required maxLength={500} />
        <label>
          <input type="checkbox" name="officiel" value="oui" /> Il s&apos;agit d&apos;un document
          officiel (ministère, IPN…)
        </label>
        <label htmlFor="texte">Texte du document</label>
        <textarea id="texte" name="texte" rows={6} placeholder="Collez le texte…" />
        <label htmlFor="pdf">Ou un PDF (10 Mo au plus)</label>
        <input id="pdf" name="pdf" type="file" accept="application/pdf" />
        <div className="actions">
          <button type="submit">Déposer le document</button>
        </div>
      </form>

      <h2>Documents ({documents.length})</h2>
      {documents.length === 0 && <p>Aucun document déposé.</p>}
      <ul>
        {documents.map((d) => (
          <li key={d.id}>
            <strong>{d.titre}</strong> ({d.format === "pdf" ? "PDF" : "texte"},{" "}
            {d.declareOfficiel ? "déclaré officiel" : "non déclaré officiel"}) — {d.origine},{" "}
            {formatDate.format(new Date(d.deposeLe))}
            {unites.length > 0 && (
              <FormulaireAnalyse document={d.id} titre={d.titre} unites={unites} />
            )}
          </li>
        ))}
      </ul>

      <h2>Rapports d&apos;écart ({rapports.length})</h2>
      <ul>
        {rapports.map((r) => (
          <li key={r.id}>
            <Link href={`/referent/conformite/${r.id}`}>
              {r.unite} — « {r.document} », version {r.version}
            </Link>{" "}
            — {r.statut === "brouillon" ? "à traiter" : "traité"},{" "}
            {formatDate.format(new Date(r.creeLe))}
          </li>
        ))}
      </ul>
    </main>
  );
}
