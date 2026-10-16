"use client";

import { useActionState } from "react";
import { decider, demanderRevue } from "./actions";

export function FormulaireRevue({ famille, libelle }: { famille: string; libelle: string }) {
  const [etat, action, enCours] = useActionState(demanderRevue, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="famille" value={famille} />
      <label htmlFor={`consigne-${famille}`}>Consigne pour le Coordinateur (facultatif)</label>
      <textarea
        id={`consigne-${famille}`}
        name="consigne"
        rows={2}
        maxLength={2000}
        placeholder="Par exemple : vérifie les notations entre la 4e et la 3e."
      />
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      {etat?.succes && <p role="status">{etat.succes}</p>}
      <div className="actions">
        <button type="submit" disabled={enCours}>
          {enCours ? "Revue en cours…" : `Lancer une revue de cohérence (${libelle})`}
        </button>
      </div>
    </form>
  );
}

/** Décision sur une proposition : accepter (si possible) ou écarter avec une remarque. */
export function FormulaireProposition({
  rapport,
  indice,
  accepter,
  ecarter,
  libelleAccepter,
  nom,
}: {
  rapport: string;
  indice: number;
  accepter: "accepter_lien" | "adopter_glossaire";
  ecarter: "ecarter_lien" | "ecarter_glossaire";
  libelleAccepter: string;
  nom: string;
}) {
  const [etat, action, enCours] = useActionState(decider, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="rapport" value={rapport} />
      <input type="hidden" name="indice" value={indice} />
      <label htmlFor={`remarque-${accepter}-${indice}`}>Remarque (obligatoire pour écarter)</label>
      <input id={`remarque-${accepter}-${indice}`} name="commentaire" maxLength={1000} />
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      <div className="actions">
        <button
          type="submit"
          name="action"
          value={accepter}
          disabled={enCours}
          aria-label={`${libelleAccepter} : ${nom}`}
        >
          {libelleAccepter}
        </button>
        <button
          type="submit"
          name="action"
          value={ecarter}
          className="secondaire"
          disabled={enCours}
          aria-label={`Écarter : ${nom}`}
        >
          Écarter
        </button>
      </div>
    </form>
  );
}

export function FormulaireClore({ rapport }: { rapport: string }) {
  const [etat, action, enCours] = useActionState(decider, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="rapport" value={rapport} />
      <input type="hidden" name="action" value="clore" />
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      <button type="submit" className="secondaire" disabled={enCours}>
        Marquer le rapport comme traité
      </button>
    </form>
  );
}
