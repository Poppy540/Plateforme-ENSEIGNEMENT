import Link from "next/link";
import { decompteCloture, type EtatGeste, type GesteEvalue } from "@/lib/pilote/cloture";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { clotureDuPilote } from "@/lib/serveur/cloture-pilote";
import { cocher, decider, decocher } from "./actions";

// Clôture du pilote (ADR 0085) : gestes vérifiés par la plateforme ou cochés avec une preuve, décision finale
// notée au journal du pilote. Rien n'est supprimé ici (sort des données : étape suivante, simulation seulement).

const ETATS: Record<EtatGeste, string> = {
  fait: "Fait",
  a_faire: "À faire",
  sans_objet: "Sans objet",
};
const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

function Geste({ g }: { g: GesteEvalue }) {
  return (
    <li id={`geste-${g.code}`} className={`carte condition ${g.etat === "fait" ? "remplie" : ""}`}>
      <h2>{g.titre}</h2>
      <p>
        <strong>{ETATS[g.etat]}</strong>
        {g.nature === "verifie" && " — vérifié par la plateforme"}
      </p>
      <p className="note">Preuve attendue : {g.preuveAttendue}</p>
      {g.detail && <p>{g.detail}</p>}
      {g.code === "decision_finale" && (
        <details>
          <summary>Noter la décision finale</summary>
          <form action={decider} className="formulaire">
            <label htmlFor="decision">Décision</label>
            <select id="decision" name="decision" required defaultValue="">
              <option value="" disabled>
                Choisir
              </option>
              <option value="arreter">Arrêter le pilote</option>
              <option value="prolonger">Prolonger le pilote</option>
              <option value="elargir">Élargir le pilote</option>
            </select>
            <label htmlFor="motif-decision">
              Motif (3 à 400 caractères, sans donnée personnelle)
            </label>
            <textarea
              id="motif-decision"
              name="motif"
              required
              minLength={3}
              maxLength={400}
              rows={3}
            />
            <button type="submit">Noter la décision</button>
          </form>
        </details>
      )}
      {g.coche && (
        <p>
          Coché : « {g.coche.preuve} », preuve du{" "}
          {formatDate.format(new Date(`${g.coche.date_preuve}T00:00:00Z`))}
        </p>
      )}
      {g.nature === "coche" && (
        <details>
          <summary>
            {g.coche ? "Mettre à jour ou retirer la coche" : "Cocher avec une preuve"}
          </summary>
          <form action={cocher} className="formulaire">
            <input type="hidden" name="geste" value={g.code} />
            <label htmlFor={`preuve-${g.code}`}>
              Preuve (3 à 300 caractères, sans donnée personnelle)
            </label>
            <textarea
              id={`preuve-${g.code}`}
              name="preuve"
              required
              minLength={3}
              maxLength={300}
              rows={2}
              defaultValue={g.coche?.preuve}
            />
            <label htmlFor={`date-${g.code}`}>Date de la preuve</label>
            <input
              id={`date-${g.code}`}
              type="date"
              name="date"
              required
              defaultValue={g.coche?.date_preuve}
            />
            <button type="submit">{g.coche ? "Mettre à jour" : "Cocher ce geste"}</button>
          </form>
          {g.coche && (
            <form action={decocher} className="formulaire">
              <input type="hidden" name="geste" value={g.code} />
              <label htmlFor={`motif-${g.code}`}>Motif du retrait</label>
              <input id={`motif-${g.code}`} name="motif" required minLength={3} maxLength={300} />
              <button type="submit" className="secondaire">
                Retirer la coche
              </button>
            </form>
          )}
        </details>
      )}
    </li>
  );
}

export default async function PageCloture({ searchParams }: PageProps<"/administration/cloture">) {
  const administrateur = await exigerAdministrateur();
  const parametres = await searchParams;
  const gestes = await clotureDuPilote(administrateur);
  const { faits, total, complete } = decompteCloture(gestes);
  const erreur = typeof parametres.erreur === "string" ? parametres.erreur.slice(0, 200) : null;
  const ok = typeof parametres.ok === "string" ? parametres.ok.slice(0, 100) : null;

  return (
    <main className="conteneur">
      <p>
        <Link href="/administration">← Administration</Link>
      </p>
      <h1>Clôture du pilote</h1>
      <p className="note">
        Gestes de fin du pilote (docs/pilote/procedure.md, « Après »). La plateforme vérifie ceux
        qu&apos;elle peut voir ; vous cochez les autres avec une preuve courte et sa date. Rien
        n&apos;est supprimé ici. Pour prolonger, notez la décision puis corrigez la période sur la
        page <Link href="/administration/fin-pilote">Rapport de fin de pilote</Link>.
      </p>
      <p className={complete ? "decompte pret" : "decompte"}>
        <strong>
          {faits} / {total} gestes faits
        </strong>
        {complete ? " : la clôture est complète." : " : la clôture n'est pas terminée."}
      </p>
      {ok && <p role="status">{ok}</p>}
      {erreur && (
        <p role="alert" className="erreur">
          {erreur}
        </p>
      )}
      <ol className="liste-cartes" aria-label="Gestes de clôture">
        {gestes.map((g) => (
          <Geste key={g.code} g={g} />
        ))}
      </ol>
    </main>
  );
}
