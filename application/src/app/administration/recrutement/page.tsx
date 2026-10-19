import Link from "next/link";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { listeCandidats, referentielsRecrutement } from "@/lib/serveur/recrutement";
import { FormulaireCandidat } from "./formulaires";
import { ADEQUATIONS, STATUTS_CANDIDAT } from "./libelles";

const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "short" });

// Pipeline de recrutement des enseignants-référents (ADR 0010, 0040) : le propriétaire décide de tout.
export default async function PageRecrutement({
  searchParams,
}: PageProps<"/administration/recrutement">) {
  const administrateur = await exigerAdministrateur();
  const { referentiel: choisi } = await searchParams;
  const tous = await referentielsRecrutement(administrateur);
  const referentiels = tous.filter((r) => r.configuration);
  const libelle = (c: { referentielId: string; famille: string }) =>
    tous.find((r) => r.id === c.referentielId)?.familles[c.famille] ?? c.famille;
  const courant = referentiels.find((r) => r.code === choisi) ?? referentiels[0];
  const candidats = await listeCandidats(administrateur);

  return (
    <main className="conteneur">
      <p>
        <Link href="/administration">← Administration</Link>
      </p>
      <h1>Recrutement des enseignants-référents</h1>
      <p className="note">
        Données fictives seulement tant que le juriste n&apos;a pas rendu son avis. L&apos;agent
        Recruteur prépare (fiches, brouillons, dossier d&apos;accord) ; vous approuvez chaque
        message avant l&apos;envoi, qui reste simulé. La liste d&apos;opposition est vérifiée juste
        avant chaque envoi ; une seule relance est possible.
      </p>

      <h2>Candidats</h2>
      {candidats.length === 0 ? (
        <p role="status">Aucun candidat.</p>
      ) : (
        <div className="tableau-defilant">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Famille</th>
                <th>Source</th>
                <th>Adéquation</th>
                <th>Statut</th>
                <th>À approuver</th>
                <th>Mis à jour</th>
              </tr>
            </thead>
            <tbody>
              {candidats.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/administration/recrutement/${c.id}`}>{c.nom}</Link>
                  </td>
                  <td>{libelle(c)}</td>
                  <td>{c.source}</td>
                  <td>{c.adequation ? (ADEQUATIONS[c.adequation] ?? c.adequation) : "—"}</td>
                  <td>{STATUTS_CANDIDAT[c.statut] ?? c.statut}</td>
                  <td>{c.enAttente}</td>
                  <td>{formatDate.format(new Date(c.majLe))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Nouvelle fiche</h2>
      {!courant ? (
        <p role="status">Aucun pack pays ne prévoit de recrutement (recrutement.yaml).</p>
      ) : (
        <>
          {referentiels.length > 1 && (
            <p>
              Référentiel :{" "}
              {referentiels.map((r) => (
                <Link
                  key={r.id}
                  href={`/administration/recrutement?referentiel=${r.code}`}
                  aria-current={r.id === courant.id ? "page" : undefined}
                >
                  {r.code}{" "}
                </Link>
              ))}
            </p>
          )}
          <p className="note">
            Fiche minimale : nom, famille, niveau, structure, email professionnel et source
            autorisée ({courant.code}). Aucune donnée sensible, aucune pièce d&apos;identité.
          </p>
          <FormulaireCandidat
            referentiel={courant.id}
            familles={Object.entries(courant.familles).map(([code, libelle]) => ({
              code,
              libelle,
            }))}
            sources={courant.configuration!.sources}
          />
        </>
      )}
    </main>
  );
}
