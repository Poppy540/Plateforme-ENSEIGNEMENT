"use client";

import { useActionState } from "react";
import { genererQuizBrouillon } from "./actions";

export function FormulaireQuiz({ chapitre }: { chapitre: string }) {
  const [etat, action, enCours] = useActionState(genererQuizBrouillon, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="chapitre" value={chapitre} />
      <label htmlFor="nombre">Nombre de questions</label>
      <input id="nombre" name="nombre" type="number" min={1} max={10} defaultValue={5} required />
      <label htmlFor="difficulte">Difficulté</label>
      <select id="difficulte" name="difficulte" defaultValue="variee">
        <option value="variee">Variée</option>
        <option value="facile">Facile</option>
        <option value="moyen">Moyenne</option>
        <option value="difficile">Difficile</option>
      </select>
      <label htmlFor="consigne-quiz">Consigne pour l&apos;Évaluateur (facultatif)</label>
      <textarea id="consigne-quiz" name="consigne" rows={3} maxLength={1000} />
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      {etat?.succes && <p role="status">{etat.succes}</p>}
      <div className="actions">
        <button type="submit" disabled={enCours}>
          {enCours ? "Création en cours (1 à 3 minutes)…" : "Générer un quiz brouillon"}
        </button>
      </div>
      <p className="note">
        L&apos;Évaluateur est une IA : le quiz reste un brouillon, invisible des élèves,
        jusqu&apos;à votre validation.
      </p>
    </form>
  );
}
