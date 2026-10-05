"use client";

import { useActionState } from "react";
import { publier } from "./actions";

export function FormulairePublication({ id }: { id: string }) {
  const [etat, action, enCours] = useActionState(publier, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="id" value={id} />
      <label>
        <input type="checkbox" name="confirmation" value="oui" /> Je confirme la publication : la
        vidéo sera visible par tous les élèves de ce chapitre.
      </label>
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      <div className="actions">
        <button type="submit" disabled={enCours}>
          Publier la vidéo pour les élèves
        </button>
      </div>
    </form>
  );
}
