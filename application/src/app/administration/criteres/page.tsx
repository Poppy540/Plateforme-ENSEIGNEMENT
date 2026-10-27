import Link from "next/link";
import { synthese, type CritereEvalue, type EtatCritere, type Niveau } from "@/lib/pilote/criteres";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { criteresDuPilote } from "@/lib/serveur/criteres-pilote";
import { declarer, lever } from "./actions";

// Critères de suspension et d'arrêt du pilote (ADR 0080) : calculés par la plateforme quand la base le permet,
// sinon déclarés par le propriétaire. La plateforme signale, le propriétaire décide.

const ETATS: Record<EtatCritere, string> = {
  rien_a_signaler: "Rien à signaler",
  a_examiner: "À examiner",
  atteint: "Atteint",
  non_surveille: "Non surveillé",
};

const NIVEAUX: Record<Niveau, { titre: string; note: string }> = {
  immediat: {
    titre: "Suspension immédiate",
    note: "Atteint : suspendre avant toute analyse, puis rechercher la cause.",
  },
  hebdomadaire: {
    titre: "Examen au point de la semaine",
    note: "À examiner : décider au point hebdomadaire, avec le référent si besoin.",
  },
  arret: { titre: "Arrêt du pilote", note: "Atteint : le pilote s'arrête." },
};

const formatDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "UTC",
});

function Critere({ c }: { c: CritereEvalue }) {
  return (
    <li id={`critere-${c.code}`} className={`carte critere ${c.etat}`}>
      <h3>{c.titre}</h3>
      <p>
        <strong className="etat-critere">{ETATS[c.etat]}</strong>
        {c.source === "calcule"
          ? " — calculé par la plateforme"
          : " — déclaré par l'administration"}
      </p>
      <p>{c.detail}</p>
      {c.declaration && (
        <p>
          Motif : « {c.declaration.motif} », le{" "}
          {formatDate.format(new Date(c.declaration.declare_le))} (UTC)
        </p>
      )}
      {(c.etat === "atteint" || c.etat === "a_examiner") && (
        <p className="note">À faire : {c.action}</p>
      )}
      {c.source === "declare" && (
        <details>
          <summary>{c.declaration ? "Mettre à jour ou lever" : "Déclarer ce critère"}</summary>
          <form action={declarer} className="formulaire">
            <input type="hidden" name="critere" value={c.code} />
            <label htmlFor={`motif-${c.code}`}>
              Motif (3 à 300 caractères, sans donnée personnelle)
            </label>
            <textarea
              id={`motif-${c.code}`}
              name="motif"
              required
              minLength={3}
              maxLength={300}
              rows={2}
              defaultValue={c.declaration?.motif}
            />
            <button type="submit">{c.declaration ? "Mettre à jour" : "Déclarer"}</button>
          </form>
          {c.declaration && (
            <form action={lever} className="formulaire">
              <input type="hidden" name="critere" value={c.code} />
              <label htmlFor={`levee-${c.code}`}>Motif de la levée</label>
              <input id={`levee-${c.code}`} name="motif" required minLength={3} maxLength={300} />
              <button type="submit" className="secondaire">
                Lever ce critère
              </button>
            </form>
          )}
        </details>
      )}
    </li>
  );
}

export default async function PageCriteres({
  searchParams,
}: PageProps<"/administration/criteres">) {
  const administrateur = await exigerAdministrateur();
  const parametres = await searchParams;
  const { pays, faits, criteres } = await criteresDuPilote(administrateur);
  const { atteints, aExaminer, nonSurveilles, arret } = synthese(criteres);
  const erreur = typeof parametres.erreur === "string" ? parametres.erreur.slice(0, 200) : null;
  const ok = typeof parametres.ok === "string" ? parametres.ok.slice(0, 100) : null;

  return (
    <main className="conteneur">
      <p>
        <Link href="/administration">← Administration</Link>
      </p>
      <h1>Critères de suspension</h1>
      <p className="note">
        Critères de docs/pilote/criteres-arret.md. La plateforme calcule ceux que la base permet de
        voir et ajoute une alerte dans la file des signalements quand l&apos;un d&apos;eux bouge ;
        vous déclarez les autres. Aucune suspension n&apos;est automatique : vous décidez.
      </p>
      <p className={atteints > 0 ? "decompte alerte-critere" : "decompte"}>
        <strong>
          {atteints === 0
            ? "Aucun critère atteint"
            : `${atteints} critère${atteints > 1 ? "s" : ""} atteint${atteints > 1 ? "s" : ""}`}
        </strong>
        {arret
          ? " : un critère d'arrêt du pilote est atteint."
          : atteints > 0
            ? " : suspension immédiate à décider."
            : "."}{" "}
        {aExaminer > 0 && `${aExaminer} à examiner au point de la semaine. `}
        {nonSurveilles > 0 &&
          `${nonSurveilles} non surveillé${nonSurveilles > 1 ? "s" : ""} (seuil à fixer dans le pack).`}
      </p>
      {pays.length === 0 && (
        <p role="note">
          Aucun chapitre du pilote n&apos;est désigné : les seuils du pack ne s&apos;appliquent pas
          encore (<Link href="/administration/pilote">Chapitres du pilote</Link>).
        </p>
      )}
      {ok && <p role="status">{ok}</p>}
      {erreur && (
        <p role="alert" className="erreur">
          {erreur}
        </p>
      )}
      <h2>Mesures en cours</h2>
      <ul>
        <li>
          Accès des élèves : <strong>{faits.acces_eleves_ouvert ? "ouvert" : "fermé"}</strong>
        </li>
        <li>
          Agents suspendus :{" "}
          <strong>
            {faits.agents_suspendus.length ? faits.agents_suspendus.join(", ") : "aucun"}
          </strong>
        </li>
      </ul>
      <p className="note">
        Suspendre un agent ou fermer l&apos;accès des élèves :{" "}
        <Link href="/administration">Administration</Link>.
      </p>
      {(Object.keys(NIVEAUX) as Niveau[]).map((niveau) => (
        <section key={niveau} aria-labelledby={`niveau-${niveau}`}>
          <h2 id={`niveau-${niveau}`}>{NIVEAUX[niveau].titre}</h2>
          <p className="note">{NIVEAUX[niveau].note}</p>
          <ul className="liste-cartes" aria-label={NIVEAUX[niveau].titre}>
            {criteres
              .filter((c) => c.niveau === niveau)
              .map((c) => (
                <Critere key={c.code} c={c} />
              ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
