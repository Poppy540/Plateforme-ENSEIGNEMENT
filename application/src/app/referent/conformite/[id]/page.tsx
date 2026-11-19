import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { rapportConformite } from "@/lib/serveur/conformite";
import { clore } from "../actions";

const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" });
const CONFIANCE = { elevee: "élevée", moyenne: "moyenne", faible: "faible" } as const;
const DONNEE = {
  officielle: "source officielle",
  deduite: "déduite",
  manquante: "manquante",
} as const;
const STATUT = {
  reutilisable: "réutilisable",
  a_adapter: "à adapter",
  a_recreer: "à recréer",
} as const;
const PRESENCE = {
  dans_les_deux: "dans les deux",
  seulement_document: "seulement dans le document",
  seulement_plateforme: "seulement sur la plateforme",
} as const;

// Rapport d'écart de la Conformité (brouillon) : une recommandation, jamais une validation (ADR 0039).
export default async function PageRapportConformite({
  params,
}: PageProps<"/referent/conformite/[id]">) {
  const referent = await exigerReferent();
  const { id } = await params;
  const r = await rapportConformite(referent, id);
  if (!r) notFound();
  const c = r.contenu;

  return (
    <main className="conteneur">
      <p>
        <Link href="/referent/conformite">← Conformité</Link>
      </p>
      <h1>
        Rapport d&apos;écart — {r.unite}, version {r.version}
      </h1>
      <p>
        Statut : <strong>{r.statut === "brouillon" ? "brouillon" : "traité"}</strong> · document «{" "}
        {r.document.titre} » ({r.document.origine}) · empreinte{" "}
        <code>{r.document.empreinte.slice(0, 12)}</code> · rédigé par l&apos;agent Conformité, une
        intelligence artificielle, le {formatDate.format(new Date(r.creeLe))}. Ce rapport recommande
        ; il ne valide rien.
      </p>
      <p>
        Document{" "}
        {c.document.officiel ? "considéré officiel" : <strong>non officiel ou non vérifié</strong>}{" "}
        — {c.document.raison}
        {c.document.version_programme && (
          <> · version du programme : {c.document.version_programme}</>
        )}
      </p>
      {c.refus && <p role="status">{c.refus}</p>}
      {c.synthese && (
        <>
          <h2>Synthèse</h2>
          {c.synthese.split("\n").map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </>
      )}
      {c.alertes.length > 0 && (
        <>
          <h2>Alertes ({c.alertes.length})</h2>
          <ul>
            {c.alertes.map((a, i) => (
              <li key={i}>
                <strong>{a.type.replaceAll("_", " ")}</strong> : {a.detail}
              </li>
            ))}
          </ul>
        </>
      )}
      {r.controles.length > 0 && (
        <>
          <h2>Corrections de la plateforme</h2>
          <ul>
            {r.controles.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}

      <h2>Extraction du document ({c.extraction.length})</h2>
      <div
        className="tableau-defilant"
        role="region"
        aria-label="Extraction du document"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th>Chapitre</th>
              <th>Volume</th>
              <th>Coeff.</th>
              <th>Source</th>
              <th>Donnée</th>
              <th>Confiance</th>
            </tr>
          </thead>
          <tbody>
            {c.extraction.map((e) => (
              <tr key={`${e.ordre}-${e.titre}`}>
                <td>
                  {e.ordre}. {e.titre}
                </td>
                <td>{e.volume_horaire ?? "manquant"}</td>
                <td>{e.coefficient ?? "manquant"}</td>
                <td>{e.source || "—"}</td>
                <td>{DONNEE[e.statut]}</td>
                <td>{CONFIANCE[e.confiance]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {c.extraction.length > 0 && (
        <p>
          <a href={`/referent/conformite/${r.id}/programme`} download>
            Télécharger le brouillon de programme (YAML)
          </a>{" "}
          <span className="note">
            à relire, puis à ranger dans le pack pays : il sera importé « à valider ».
          </span>
        </p>
      )}

      <h2>Comparaison avec la plateforme ({c.comparaison.length})</h2>
      <div
        className="tableau-defilant"
        role="region"
        aria-label="Comparaison avec la plateforme"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th>Chapitre</th>
              <th>Présence</th>
              <th>Statut</th>
              <th>Écart</th>
              <th>Confiance</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {c.comparaison.map((x, i) => (
              <tr key={i}>
                <td>{x.chapitre || x.titre_document}</td>
                <td>{PRESENCE[x.presence]}</td>
                <td>{STATUT[x.statut]}</td>
                <td>{x.ecart}</td>
                <td>{CONFIANCE[x.confiance]}</td>
                <td>{x.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {c.points_a_valider.length > 0 && (
        <>
          <h2>Points à faire valider</h2>
          <ul>
            {c.points_a_valider.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}

      {r.statut === "brouillon" && (
        <form action={clore}>
          <input type="hidden" name="rapport" value={r.id} />
          <button type="submit" className="secondaire">
            Marquer le rapport comme traité
          </button>
        </form>
      )}
    </main>
  );
}
