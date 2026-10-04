"use client";

import { useActionState } from "react";
import { lancerProductionVideo } from "./actions";

export function FormulaireProduction({
  id,
  version,
  empreinte,
  simulation,
}: {
  id: string;
  version: number;
  empreinte: string;
  simulation: boolean;
}) {
  const [etat, action, enCours] = useActionState(lancerProductionVideo, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="empreinte" value={empreinte} />
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      {etat?.succes && <p role="status">{etat.succes}</p>}
      <div className="actions">
        <button type="submit" disabled={enCours}>
          {enCours
            ? "Production en cours…"
            : `Lancer la production de la version ${version}${simulation ? " (services simulés)" : ""}`}
        </button>
      </div>
      <p className="note">
        La chaîne vérifie que cette version validée n&apos;a pas changé, produit voix, avatar et
        sous-titres sans modifier le texte, contrôle la fidélité, respecte le budget, puis dépose la
        vidéo « à relire ». Elle ne publie jamais.
      </p>
    </form>
  );
}
