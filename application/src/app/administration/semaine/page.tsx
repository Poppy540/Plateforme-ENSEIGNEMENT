import Link from "next/link";
import { libelleJournal } from "@/lib/pilote/semaine";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { finDeSemaine, semaineDuPilote, versionDemandee } from "@/lib/serveur/semaine-pilote";

// Rapport hebdomadaire agrégé du pilote (ADR 0082) : les 5 questions du retour d'expérience, semaine et semaine
// précédente ; version équipe ou version établissement (sans coûts ni détail des agents). Imprimable.

const formatJour = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const jour = (iso: string) => formatJour.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

export default async function PageSemaine({ searchParams }: PageProps<"/administration/semaine">) {
  const administrateur = await exigerAdministrateur();
  const parametres = await searchParams;
  const fin = finDeSemaine(parametres.fin);
  const version = versionDemandee(parametres.version);
  const r = await semaineDuPilote(administrateur, fin, version);
  const telechargement = `/api/administration/semaine?${new URLSearchParams({ fin, version })}`;

  return (
    <main className="conteneur rapport-semaine">
      <p className="ne-pas-imprimer">
        <Link href="/administration">← Administration</Link>
      </p>
      <h1>Semaine du pilote</h1>
      <p>
        Du {jour(r.debut)} au {jour(r.fin)} —{" "}
        <strong>{version === "equipe" ? "version équipe" : "version pour l'établissement"}</strong>
      </p>
      <p className="note">
        Chiffres agrégés, aucune donnée individuelle ; aucun effectif de moins de 5 personnes («
        &lt;5 »), pas de moyenne sous 5 quiz.
        {version === "equipe"
          ? " Version complète, à ne pas diffuser hors de l'équipe."
          : " Sans coûts, sans détail des agents ni de l'équipe."}
      </p>
      <form method="get" className="formulaire ne-pas-imprimer">
        <label htmlFor="fin">Dernier jour de la semaine</label>
        <input id="fin" type="date" name="fin" defaultValue={fin} />
        <label htmlFor="version">Version</label>
        <select id="version" name="version" defaultValue={version}>
          <option value="equipe">Équipe (complète)</option>
          <option value="etablissement">Établissement (sans coûts ni détail des agents)</option>
        </select>
        <button type="submit" className="secondaire">
          Afficher
        </button>
      </form>
      <p className="ne-pas-imprimer">
        <a href={telechargement} download>
          Télécharger en texte (Markdown)
        </a>{" "}
        · pour une copie papier, utilisez « Imprimer » dans le navigateur.
      </p>

      {r.sections.map((s) => (
        <section key={s.titre} aria-labelledby={`section-${s.titre.slice(0, 2)}`}>
          <h2 id={`section-${s.titre.slice(0, 2)}`}>{s.titre}</h2>
          <div
            className="tableau-defilant"
            tabIndex={0}
            role="region"
            aria-label={`Tableau — ${s.titre}`}
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Indicateur</th>
                  <th scope="col">Semaine</th>
                  <th scope="col">Semaine précédente</th>
                </tr>
              </thead>
              <tbody>
                {s.lignes.map((l) => (
                  <tr key={l.libelle}>
                    <th scope="row">{l.libelle}</th>
                    <td>{l.semaine}</td>
                    <td>{l.precedente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {version === "equipe" && (
        <>
          <h2>Critères de suspension (état actuel)</h2>
          {r.criteres.length === 0 ? (
            <p>Aucun critère atteint ni à examiner.</p>
          ) : (
            <ul>
              {r.criteres.map((c) => (
                <li key={c.titre}>
                  <strong>{c.etat}</strong> : {c.titre}. {c.detail}
                </li>
              ))}
            </ul>
          )}
          <h2>Décisions de la semaine (journal du pilote)</h2>
          {r.journal.length === 0 ? (
            <p>Aucune décision notée.</p>
          ) : (
            <ul>
              {r.journal.map((e) => (
                <li key={`${e.cree_le}-${e.type}`}>
                  {jour(e.cree_le)} — {libelleJournal(e.type)}
                  {e.agent ? ` (${e.agent})` : ""} : {e.texte}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
