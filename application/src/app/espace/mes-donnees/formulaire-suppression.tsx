"use client";

import { useActionState } from "react";
import { supprimerMonCompte } from "./actions";

export function FormulaireSuppression() {
  const [etat, action, enCours] = useActionState(supprimerMonCompte, undefined);
  return (
    <form action={action} className="formulaire">
      <label htmlFor="confirmation">Pour confirmer, écris SUPPRIMER</label>
      <input
        id="confirmation"
        name="confirmation"
        autoComplete="off"
        autoCapitalize="characters"
        required
      />
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      <button type="submit" className="danger" disabled={enCours}>
        Supprimer définitivement mon compte
      </button>
    </form>
  );
}
