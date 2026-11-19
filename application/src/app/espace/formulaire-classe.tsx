"use client";

import { useActionState } from "react";
import { rejoindre } from "./classe-actions";

export function FormulaireClasse() {
  const [etat, action, enCours] = useActionState(rejoindre, undefined);
  return (
    <form action={action} className="formulaire">
      <label htmlFor="code_classe">Code de ta classe (donné par ton enseignant)</label>
      <input
        id="code_classe"
        name="code_classe"
        autoComplete="off"
        autoCapitalize="characters"
        placeholder="XXXX-XXXX-XXXX"
        required
      />
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      <button type="submit" disabled={enCours}>
        Rejoindre ma classe
      </button>
    </form>
  );
}
