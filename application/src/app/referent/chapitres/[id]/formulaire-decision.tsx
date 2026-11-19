"use client";

import { useActionState } from "react";
import { decider } from "./actions";

export function FormulaireDecision({ id, version }: { id: string; version: number }) {
  const [etat, action, enCours] = useActionState(decider, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <label htmlFor="commentaire">Commentaire (obligatoire en cas de rejet)</label>
      <textarea id="commentaire" name="commentaire" rows={4} maxLength={2000} />
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
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
