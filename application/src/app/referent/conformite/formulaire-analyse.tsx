"use client";

import { useActionState } from "react";
import { analyser } from "./actions";

export function FormulaireAnalyse({
  document,
  titre,
  unites,
}: {
  document: string;
  titre: string;
  unites: { id: string; libelle: string }[];
}) {
  const [etat, action, enCours] = useActionState(analyser, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="document" value={document} />
      <label htmlFor={`unite-${document}`}>Unité à comparer</label>
      <select id={`unite-${document}`} name="unite" required>
        {unites.map((u) => (
          <option key={u.id} value={u.id}>
            {u.libelle}
          </option>
        ))}
      </select>
      <label htmlFor={`consigne-${document}`}>Consigne (facultatif)</label>
      <input id={`consigne-${document}`} name="consigne" maxLength={2000} />
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      {etat?.succes && <p role="status">{etat.succes}</p>}
      <div className="actions">
        <button type="submit" disabled={enCours} aria-label={`Analyser « ${titre} »`}>
          {enCours ? "Analyse en cours…" : "Analyser"}
        </button>
      </div>
    </form>
  );
}
