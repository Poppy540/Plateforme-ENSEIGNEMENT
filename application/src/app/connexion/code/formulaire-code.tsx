"use client";

import { useActionState } from "react";
import { verifierCode } from "../actions";

export function FormulaireCode() {
  const [etat, action, enCours] = useActionState(verifierCode, undefined);
  return (
    <form action={action} className="formulaire">
      <label htmlFor="code">Code reçu (6 chiffres)</label>
      <input
        id="code"
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        maxLength={7}
        required
      />
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      <button type="submit" disabled={enCours}>
        {enCours ? "Vérification…" : "Valider"}
      </button>
    </form>
  );
}
