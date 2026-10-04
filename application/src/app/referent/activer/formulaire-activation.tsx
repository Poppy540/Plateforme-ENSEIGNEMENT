"use client";

import { useActionState } from "react";
import { activer } from "./actions";

export function FormulaireActivation() {
  const [etat, action, enCours] = useActionState(activer, undefined);
  return (
    <form action={action} className="formulaire">
      <label htmlFor="prenom">Votre prénom ou un pseudonyme</label>
      <input id="prenom" name="prenom" maxLength={40} defaultValue={etat?.prenom} required />
      <label htmlFor="code">Code d&apos;invitation</label>
      <input
        id="code"
        name="code"
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
        Activer mon accès
      </button>
    </form>
  );
}
