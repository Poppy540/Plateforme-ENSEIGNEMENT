import Link from "next/link";
import { CRITERES } from "@/lib/pilote/criteres";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { journalDuPilote, type EntreeJournal } from "@/lib/serveur/journal-pilote";
import { noter } from "./actions";

// Journal du pilote (ADR 0081) : décisions du propriétaire, datées et tracées. Les suspensions et reprises
// viennent des boutons de l'administration ; les points hebdomadaires et notes s'ajoutent ici.

const TYPES: Record<EntreeJournal["type"], string> = {
  suspension_agent: "Suspension d'un agent",
  reprise_agent: "Reprise d'un agent",
  fermeture_acces: "Fermeture de l'accès des élèves",
  reprise_acces: "Réouverture de l'accès des élèves",
  point_hebdomadaire: "Point hebdomadaire",
  note: "Note",
};
const TITRES = new Map(CRITERES.map((c) => [c.code, c.titre]));
const formatDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "UTC",
});

export default async function PageJournal({ searchParams }: PageProps<"/administration/journal">) {
  const administrateur = await exigerAdministrateur();
  const parametres = await searchParams;
  const entrees = await journalDuPilote(administrateur);
  const erreur = typeof parametres.erreur === "string" ? parametres.erreur.slice(0, 200) : null;
  const ok = typeof parametres.ok === "string" ? parametres.ok.slice(0, 100) : null;

  return (
    <main className="conteneur">
      <p>
        <Link href="/administration">← Administration</Link>
      </p>
      <h1>Journal du pilote</h1>
      <p className="note">
        Décisions prises pendant le pilote, des plus récentes aux plus anciennes. Suspensions et
        reprises s&apos;y notent seules depuis l&apos;administration ; une reprise exige la cause,
        la correction testée, votre accord et l&apos;information de l&apos;établissement. Aucun nom
        ni coordonnée : les numéros et emails sont masqués.
      </p>
      {ok && <p role="status">{ok}</p>}
      {erreur && (
        <p role="alert" className="erreur">
          {erreur}
        </p>
      )}
      <details>
        <summary>Ajouter un point hebdomadaire ou une note</summary>
        <form action={noter} className="formulaire">
          <label htmlFor="type">Type</label>
          <select id="type" name="type" defaultValue="point_hebdomadaire">
            <option value="point_hebdomadaire">Point hebdomadaire</option>
            <option value="note">Note</option>
          </select>
          <label htmlFor="texte">Texte (3 à 500 caractères, sans donnée personnelle)</label>
          <textarea id="texte" name="texte" required minLength={3} maxLength={500} rows={4} />
          <label htmlFor="critere">Critère concerné (facultatif)</label>
          <select id="critere" name="critere" defaultValue="">
            <option value="">Aucun</option>
            {CRITERES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.titre}
              </option>
            ))}
          </select>
          <button type="submit">Ajouter au journal</button>
        </form>
      </details>
      <h2>Entrées ({entrees.length})</h2>
      {entrees.length === 0 && <p>Aucune décision notée pour l&apos;instant.</p>}
      <ol className="liste-cartes" aria-label="Entrées du journal du pilote">
        {entrees.map((e) => (
          <li key={e.id} className={`carte entree-journal ${e.type}`}>
            <h3>
              {TYPES[e.type]}
              {e.agent ? ` : ${e.agent}` : ""}
            </h3>
            <p className="note">{formatDate.format(new Date(e.cree_le))} (UTC)</p>
            {/* Une reprise est décrite par ses 4 points ci-dessous. */}
            {!e.cause && <p>{e.texte}</p>}
            {e.critere && <p>Critère : {TITRES.get(e.critere) ?? e.critere}</p>}
            {e.cause && (
              <ul>
                <li>Cause identifiée : {e.cause}</li>
                <li>Correction faite et testée : {e.correction}</li>
                <li>Accord du propriétaire : donné</li>
                <li>Établissement : informé</li>
              </ul>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}
