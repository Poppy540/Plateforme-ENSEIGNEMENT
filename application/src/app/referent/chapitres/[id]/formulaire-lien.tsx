"use client";

import { useActionState } from "react";
import { deciderLien } from "./actions";

/** Décision sur un lien de prérequis proposé (commentaire obligatoire pour un rejet). */
export function FormulaireLien({
  chapitre,
  prerequis,
  titre,
}: {
  chapitre: string;
  prerequis: string;
  titre: string;
}) {
  const [etat, action, enCours] = useActionState(deciderLien, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="chapitre" value={chapitre} />
      <input type="hidden" name="prerequis" value={prerequis} />
      <label htmlFor={`commentaire-${prerequis}`}>
        Remarque sur ce lien (obligatoire pour rejeter)
      </label>
      <input id={`commentaire-${prerequis}`} name="commentaire" maxLength={1000} />
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      <div className="actions">
        <button
          type="submit"
          name="decision"
          value="valide"
          disabled={enCours}
          aria-label={`Valider le lien avec ${titre}`}
        >
          Valider le lien
        </button>
        <button
          type="submit"
          name="decision"
          value="rejete"
          className="secondaire"
          disabled={enCours}
          aria-label={`Rejeter le lien avec ${titre}`}
        >
          Rejeter
        </button>
      </div>
    </form>
  );
}
