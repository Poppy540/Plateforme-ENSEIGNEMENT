import Link from "next/link";
import { libelleJournal } from "@/lib/pilote/semaine";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { periodeDuPilote, rapportDeFin } from "@/lib/serveur/fin-pilote";
import { versionDemandee } from "@/lib/serveur/semaine-pilote";
import { enregistrerPeriode } from "./actions";

// Rapport de fin de pilote (ADR 0084) : période saisie ici, puis les 5 questions sur toute la période (total et
// semaine par semaine), questionnaire anonyme, critères signalés et décisions (version équipe). Imprimable.

const formatJour = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const jour = (iso: string) => formatJour.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
const PUBLICS: Record<string, string> = { eleve: "élèves", parent: "parents" };

export default async function PageFinPilote({
  searchParams,
}: PageProps<"/administration/fin-pilote">) {
  const administrateur = await exigerAdministrateur();
  const parametres = await searchParams;
  const version = versionDemandee(parametres.version);
  const periode = await periodeDuPilote(administrateur);
  const r = periode ? await rapportDeFin(administrateur, periode, version) : null;
  const erreur = typeof parametres.erreur === "string" ? parametres.erreur.slice(0, 200) : null;
  const ok = typeof parametres.ok === "string" ? parametres.ok.slice(0, 100) : null;

  return (
    <main className="conteneur rapport-semaine">
      <p className="ne-pas-imprimer">
        <Link href="/administration">← Administration</Link>
      </p>
      <h1>Rapport de fin de pilote</h1>
      {ok && (
        <p role="status" className="ne-pas-imprimer">
          {ok}
        </p>
      )}
      {erreur && (
        <p role="alert" className="erreur ne-pas-imprimer">
          {erreur}
        </p>
      )}
      <details className="ne-pas-imprimer" open={!periode}>
        <summary>
          {periode ? "Corriger la période du pilote" : "Saisir la période du pilote"}
        </summary>
        <form action={enregistrerPeriode} className="formulaire">
          <label htmlFor="debut">Premier jour du pilote</label>
          <input id="debut" type="date" name="debut" required defaultValue={periode?.debut} />
          <label htmlFor="fin">Dernier jour (vide si le pilote est en cours)</label>
          <input id="fin" type="date" name="fin" defaultValue={periode?.fin ?? ""} />
          <button type="submit">Enregistrer la période</button>
        </form>
      </details>

      {!r ? (
        <p>Saisissez d&apos;abord la période du pilote.</p>
      ) : (
        <>
          <p>
            Du {jour(r.debut)} au {jour(r.fin)}
            {r.enCours && " (pilote en cours)"} —{" "}
            <strong>
              {version === "equipe" ? "version équipe" : "version pour l'établissement"}
            </strong>
          </p>
          <p className="note">
            Chiffres agrégés, aucune donnée individuelle ; aucun effectif de moins de 5 personnes («
            &lt;5 »), pas de moyenne sous 5 quiz.
            {version === "equipe"
              ? " Version complète, à ne pas diffuser hors de l'équipe."
              : " Sans coûts, sans détail des agents ni de l'équipe."}
          </p>
          <form method="get" className="formulaire ne-pas-imprimer">
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
            <a href={`/api/administration/fin-pilote?${new URLSearchParams({ version })}`} download>
              Télécharger en texte (Markdown)
            </a>{" "}
            · pour une copie papier, utilisez « Imprimer » dans le navigateur.
          </p>
          <p className="note">
            {r.semaines
              .map((s, i) => `Sem. ${i + 1} : du ${jour(s.debut)} au ${jour(s.fin)}`)
              .join(" ; ")}
          </p>

          {r.sections.map((s) => (
            <section key={s.titre}>
              <h2>{s.titre}</h2>
              <div
                className="tableau-defilant tableau-large"
                tabIndex={0}
                role="region"
                aria-label={`Tableau — ${s.titre}`}
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Indicateur</th>
                      {r.colonnes.map((c) => (
                        <th key={c} scope="col">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.lignes.map((l) => (
                      <tr key={l.libelle}>
                        <th scope="row">{l.libelle}</th>
                        {l.valeurs.map((v, i) => (
                          <td key={r.colonnes[i]}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Sur un écran étroit : une carte par indicateur (le tableau reste à l'impression). */}
              <ul className="liste-cartes rapport-cartes" aria-label={`Cartes — ${s.titre}`}>
                {s.lignes.map((l) => (
                  <li key={l.libelle} className="carte">
                    <strong>{l.libelle}</strong>
                    <dl className="chiffres">
                      {l.valeurs.map((v, i) => (
                        <div key={r.colonnes[i]}>
                          <dt>{r.colonnes[i]}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <h2>Questionnaire anonyme</h2>
          {r.questionnaire.length === 0 ? (
            <p>Moins de 5 réponses par groupe : rien à montrer.</p>
          ) : (
            <ul>
              {r.questionnaire.map((q) => (
                <li key={`${q.public}-${q.texte}`}>
                  {q.texte} ({PUBLICS[q.public] ?? q.public}, {q.total} réponses) :{" "}
                  {q.options.map((o) => `${o.option} ${o.nombre}`).join(" ; ")}
                </li>
              ))}
            </ul>
          )}

          {version === "equipe" && (
            <>
              <h2>Critères de suspension signalés pendant le pilote</h2>
              {r.alertes.length === 0 ? (
                <p>Aucun.</p>
              ) : (
                <ul>
                  {r.alertes.map((a) => (
                    <li key={`${a.cree_le}-${a.resume}`}>
                      {jour(a.cree_le)} — priorité {a.priorite} :{" "}
                      {a.resume.replace(/^Critère de suspension du pilote : /, "")}
                    </li>
                  ))}
                </ul>
              )}
              <h2>Décisions (journal du pilote)</h2>
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
        </>
      )}
    </main>
  );
}
