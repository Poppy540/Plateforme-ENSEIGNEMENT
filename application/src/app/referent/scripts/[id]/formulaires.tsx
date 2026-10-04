"use client";

import { useActionState } from "react";
import { deciderSurScript, demanderRevision } from "./actions";

function Messages({ etat }: { etat: { erreur?: string; succes?: string } | undefined }) {
  return (
    <>
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      {etat?.succes && <p role="status">{etat.succes}</p>}
    </>
  );
}

export function FormulaireDecisionScript({
  id,
  version,
  pointsSignales,
}: {
  id: string;
  version: number;
  /** Points [À VÉRIFIER], exemples locaux ou sujet sensible : confirmation exigée avant validation. */
  pointsSignales: boolean;
}) {
  const [etat, action, enCours] = useActionState(deciderSurScript, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="a_verifier" value={pointsSignales ? "oui" : "non"} />
      {pointsSignales && (
        <label>
          <input type="checkbox" name="verifie" value="oui" /> J&apos;ai vérifié les points [À
          VÉRIFIER], les exemples locaux et, le cas échéant, le traitement du sujet sensible.
        </label>
      )}
      <label htmlFor="commentaire">Commentaire (obligatoire en cas de rejet)</label>
      <textarea id="commentaire" name="commentaire" rows={4} maxLength={2000} />
      <Messages etat={etat} />
      <div className="actions">
        <button type="submit" name="decision" value="valide" disabled={enCours}>
          Valider la version {version}
        </button>
        <button
          type="submit"
          name="decision"
          value="rejete"
          className="secondaire"
          disabled={enCours}
        >
          Rejeter
        </button>
      </div>
    </form>
  );
}

export function FormulaireRevision({
  id,
  chapitre,
  duree,
  corrections,
}: {
  id: string;
  chapitre: string;
  duree: number;
  corrections: string;
}) {
  const [etat, action, enCours] = useActionState(demanderRevision, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="chapitre" value={chapitre} />
      <label htmlFor="duree-revision">Durée cible (minutes)</label>
      <input
        id="duree-revision"
        name="duree"
        type="number"
        min={2}
        max={30}
        defaultValue={duree}
        required
      />
      <label htmlFor="corrections">Corrections attendues</label>
      <textarea
        id="corrections"
        name="consigne"
        rows={4}
        maxLength={1000}
        defaultValue={corrections}
        required
      />
      <Messages etat={etat} />
      <div className="actions">
        <button type="submit" className="secondaire" disabled={enCours}>
          {enCours ? "Révision en cours (1 à 3 minutes)…" : "Faire réviser par le Scénariste"}
        </button>
      </div>
      <p className="note">La révision crée une nouvelle version, à relire et valider à son tour.</p>
    </form>
  );
}
