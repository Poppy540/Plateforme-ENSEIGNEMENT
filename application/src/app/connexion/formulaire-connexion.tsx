"use client";

import { useActionState } from "react";
import { demanderCode } from "./actions";

export function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState(demanderCode, undefined);
  return (
    <form action={action} className="formulaire">
      <label htmlFor="identifiant">Ton numéro de téléphone (ou ton email)</label>
      <input
        id="identifiant"
        name="identifiant"
        type="text"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+241 …"
        required
      />
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      <button type="submit" disabled={enCours}>
        {enCours ? "Envoi…" : "Recevoir un code"}
      </button>
    </form>
  );
}
