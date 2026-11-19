import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { ficheCandidat, referentielsRecrutement } from "@/lib/serveur/recrutement";
import { annuler, approuver, changerStatut, supprimer } from "../actions";
import { FormulaireEnvoi, FormulaireTache } from "../formulaires";
import { ADEQUATIONS, NATURES, STATUTS_CANDIDAT, STATUTS_MESSAGE } from "../libelles";

const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" });

// Fiche d'un candidat : tâches de l'agent, approbation (empreinte du texte affiché), envoi simulé, décisions.
export default async function PageCandidat({
  params,
}: PageProps<"/administration/recrutement/[id]">) {
  const administrateur = await exigerAdministrateur();
  const { id } = await params;
  const c = await ficheCandidat(administrateur, id);
  if (!c) notFound();
  const arret = ["refus", "suppression_demandee"].includes(c.statut);
  const familles =
    (await referentielsRecrutement(administrateur)).find((r) => r.id === c.referentielId)
      ?.familles ?? {};

  return (
    <main className="conteneur">
      <p>
        <Link href="/administration/recrutement">← Recrutement</Link>
      </p>
      <h1>{c.nom}</h1>
      <p role="status">
        Statut : <strong>{STATUTS_CANDIDAT[c.statut] ?? c.statut}</strong>
        {c.adequation && <> — adéquation : {ADEQUATIONS[c.adequation] ?? c.adequation}</>}
      </p>
      {arret && (
        <p className="erreur">
          Cette personne a refusé ou demandé la suppression de ses données : plus aucun contact.
        </p>
      )}
      <ul>
        <li>Famille : {familles[c.famille] ?? c.famille}</li>
        <li>Niveau : {c.niveau ?? "—"}</li>
        <li>Établissement ou structure : {c.structure ?? "—"}</li>
        <li>Contact : {c.contact}</li>
        <li>
          Source : {c.source}
          {c.sourceDetail && ` (${c.sourceDetail})`}
        </li>
        {c.justification && <li>Justification : {c.justification}</li>}
        {c.pointsAVerifier.length > 0 && <li>À vérifier : {c.pointsAVerifier.join(" ; ")}</li>}
        {c.secteurPublicAVerifier && (
          <li>
            <strong>Secteur public :</strong> une autorisation de l&apos;employeur est peut-être
            nécessaire (à vérifier, l&apos;agent ne tranche pas).
          </li>
        )}
      </ul>

      {!arret && (
        <>
          <h2>Demander à l&apos;agent Recruteur</h2>
          <FormulaireTache candidat={c.id} />
        </>
      )}

      <h2>Messages</h2>
      {c.messages.length === 0 && <p role="status">Aucun message.</p>}
      {c.messages.map((m) => (
        <article key={m.id} className="carte">
          <h3>
            {NATURES[m.nature] ?? m.nature} — {STATUTS_MESSAGE[m.statut] ?? m.statut}
          </h3>
          <p>
            <strong>Objet :</strong> {m.objet}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>{m.texte}</p>
          <p className="note">
            Rédigé le {formatDate.format(new Date(m.creeLe))}
            {m.approuveLe && ` ; approuvé le ${formatDate.format(new Date(m.approuveLe))}`}
            {m.envoyeLe && ` ; envoyé le ${formatDate.format(new Date(m.envoyeLe))}`}. Empreinte :{" "}
            <code>{m.empreinte.slice(0, 12)}</code>
          </p>
          {!arret && m.statut === "brouillon" && (
            <div className="actions">
              <form action={approuver}>
                <input type="hidden" name="candidat" value={c.id} />
                <input type="hidden" name="message" value={m.id} />
                <input type="hidden" name="empreinte" value={m.empreinte} />
                <button type="submit" aria-label={`Approuver « ${m.objet} »`}>
                  Approuver ce texte
                </button>
              </form>
              <form action={annuler}>
                <input type="hidden" name="candidat" value={c.id} />
                <input type="hidden" name="message" value={m.id} />
                <button type="submit" className="secondaire">
                  Annuler
                </button>
              </form>
            </div>
          )}
          {!arret && m.statut === "approuve" && (
            <div className="actions">
              <FormulaireEnvoi
                candidat={c.id}
                referentiel={c.referentielId}
                message={m.id}
                objet={m.objet}
              />
              <form action={annuler}>
                <input type="hidden" name="candidat" value={c.id} />
                <input type="hidden" name="message" value={m.id} />
                <button type="submit" className="secondaire">
                  Annuler
                </button>
              </form>
            </div>
          )}
        </article>
      ))}

      <h2>Dossier d&apos;accord</h2>
      {c.dossiers.length === 0 && <p role="status">Aucun dossier.</p>}
      {c.dossiers.map((d) => (
        <article key={d.id} className="carte">
          <p style={{ whiteSpace: "pre-wrap" }}>{d.resume}</p>
          <p>
            Consentement séparé pour la voix ou l&apos;image :{" "}
            {d.consentementSepare ? "prévu (document distinct)" : "non prévu"}
          </p>
          {d.pointsAValider.length > 0 && (
            <ul>
              {d.pointsAValider.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <p className="note">
            Brouillon du {formatDate.format(new Date(d.creeLe))} : rien n&apos;est conclu avant la
            signature humaine.
          </p>
        </article>
      ))}

      <h2>Décisions du propriétaire</h2>
      <div className="actions">
        {!arret && c.statut !== "signe" && (
          <>
            <form action={changerStatut}>
              <input type="hidden" name="candidat" value={c.id} />
              <input type="hidden" name="statut" value="entretien" />
              <button type="submit" className="secondaire">
                Entretien mené
              </button>
            </form>
            {c.dossiers.length > 0 && (
              <form action={changerStatut}>
                <input type="hidden" name="candidat" value={c.id} />
                <input type="hidden" name="statut" value="signe" />
                <button type="submit" className="secondaire">
                  Accord signé (hors plateforme)
                </button>
              </form>
            )}
          </>
        )}
        <form action={supprimer}>
          <input type="hidden" name="candidat" value={c.id} />
          <button type="submit" className="secondaire">
            Supprimer la fiche et les messages
          </button>
        </form>
      </div>
      <p className="note">
        La suppression efface la fiche, les messages et le dossier ; seule une empreinte du contact
        reste dans la liste d&apos;opposition pour ne plus jamais le recontacter.
      </p>
    </main>
  );
}
