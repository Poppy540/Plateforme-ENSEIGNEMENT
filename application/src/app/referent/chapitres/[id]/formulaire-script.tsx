"use client";

import { useActionState } from "react";
import { genererBrouillon } from "./actions";

export function FormulaireScript({
  chapitre,
  dureeParDefaut,
}: {
  chapitre: string;
  dureeParDefaut: number;
}) {
  const [etat, action, enCours] = useActionState(genererBrouillon, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="chapitre" value={chapitre} />
      <label htmlFor="duree">Durée cible de la vidéo (minutes)</label>
      <input
        id="duree"
        name="duree"
        type="number"
        min={2}
        max={30}
        defaultValue={dureeParDefaut}
        required
      />
      <label htmlFor="consigne">Consigne pour le Scénariste (facultatif)</label>
      <textarea id="consigne" name="consigne" rows={3} maxLength={1000} />
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      {etat?.succes && <p role="status">{etat.succes}</p>}
      <div className="actions">
        <button type="submit" disabled={enCours}>
          {enCours ? "Rédaction en cours (1 à 3 minutes)…" : "Générer un brouillon de script"}
        </button>
      </div>
      <p className="note">
        Le Scénariste est une IA : tout ce qu&apos;il écrit est un brouillon, à relire et valider
        par vous.
      </p>
    </form>
  );
}
