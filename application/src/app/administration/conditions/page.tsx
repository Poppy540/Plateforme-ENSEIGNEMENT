import Link from "next/link";
import { decompte, type ConditionEvaluee, type EtatCondition } from "@/lib/pilote/conditions";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { conditionsDuPilote } from "@/lib/serveur/conditions-pilote";
import { cocher, decocher } from "./actions";

// Tableau des 12 conditions du pilote (ADR 0078) : vérifiées par la plateforme quand c'est possible, sinon cochées
// par le propriétaire avec une preuve courte et datée (tracée). Le décompte sert à la décision de démarrer (G2).

const LIBELLES: Record<EtatCondition, string> = {
  remplie: "Remplie",
  a_faire: "À faire",
  a_revoir: "À revoir : cochée, mais la vérification échoue",
};

const formatDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

function Condition({ c }: { c: ConditionEvaluee }) {
  return (
    <li id={`condition-${c.numero}`} className={`carte condition ${c.etat}`}>
      <h2>
        {c.numero}. {c.titre}
      </h2>
      <p>
        <strong className="etat-condition">{LIBELLES[c.etat]}</strong>
        {c.nature === "automatique" && " — vérifiée par la plateforme"}
      </p>
      <p className="note">Preuve attendue : {c.preuveAttendue}</p>
      {c.verification && (
        <p>
          {c.verification.ok ? "✓" : "✗"} {c.verification.detail}
        </p>
      )}
      {c.coche && (
        <p>
          Cochée : « {c.coche.preuve} », preuve du{" "}
          {formatDate.format(new Date(`${c.coche.date_preuve}T00:00:00Z`))}
        </p>
      )}
      {c.nature !== "automatique" && (
        <details>
          <summary>
            {c.coche ? "Mettre à jour ou retirer la coche" : "Cocher avec une preuve"}
          </summary>
          <form action={cocher} className="formulaire">
            <input type="hidden" name="numero" value={c.numero} />
            <label htmlFor={`preuve-${c.numero}`}>
              Preuve (3 à 300 caractères, sans donnée personnelle)
            </label>
            <textarea
              id={`preuve-${c.numero}`}
              name="preuve"
              required
              minLength={3}
              maxLength={300}
              rows={2}
              defaultValue={c.coche?.preuve}
            />
            <label htmlFor={`date-${c.numero}`}>Date de la preuve</label>
            <input
              id={`date-${c.numero}`}
              type="date"
              name="date"
              required
              defaultValue={c.coche?.date_preuve}
            />
            <button type="submit">
              {c.coche ? "Mettre à jour" : `Cocher la condition ${c.numero}`}
            </button>
          </form>
          {c.coche && (
            <form action={decocher} className="formulaire">
              <input type="hidden" name="numero" value={c.numero} />
              <label htmlFor={`motif-${c.numero}`}>Motif du retrait</label>
              <input id={`motif-${c.numero}`} name="motif" required minLength={3} maxLength={300} />
              <button type="submit" className="secondaire">
                Retirer la coche de la condition {c.numero}
              </button>
            </form>
          )}
        </details>
      )}
    </li>
  );
}

export default async function PageConditions({
  searchParams,
}: PageProps<"/administration/conditions">) {
  const administrateur = await exigerAdministrateur();
  const parametres = await searchParams;
  const conditions = await conditionsDuPilote(administrateur);
  const { remplies, total, pret } = decompte(conditions);
  const erreur = typeof parametres.erreur === "string" ? parametres.erreur.slice(0, 200) : null;
  const ok = typeof parametres.ok === "string" ? parametres.ok.slice(0, 100) : null;

  return (
    <main className="conteneur">
      <p>
        <Link href="/administration">← Administration</Link>
      </p>
      <h1>Conditions du pilote</h1>
      <p className="note">
        Le pilote ne commence qu&apos;avec les {total} conditions remplies (docs/pilote/README.md).
        Les conditions 3 et 4 sont vérifiées par la plateforme ; les autres sont cochées par vous,
        avec une preuve courte et sa date. Certaines vérifient aussi la configuration du serveur :
        seuls les noms des variables à régler sont affichés, jamais leur valeur.
      </p>
      <p className={pret ? "decompte pret" : "decompte"}>
        <strong>
          {remplies} / {total} conditions remplies
        </strong>
        {pret
          ? " : la décision de démarrer le pilote peut être prise (G2)."
          : " : le pilote ne peut pas encore commencer."}
      </p>
      {ok && <p role="status">{ok}</p>}
      {erreur && (
        <p role="alert" className="erreur">
          Condition {String(parametres.condition ?? "").slice(0, 2)} : {erreur}
        </p>
      )}
      <ol className="liste-cartes" aria-label="Conditions du pilote">
        {conditions.map((c) => (
          <Condition key={c.numero} c={c} />
        ))}
      </ol>
    </main>
  );
}
