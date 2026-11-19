"use client";

import { useActionState } from "react";
import { effacerDonneesLocales } from "../../composants/hors-ligne";
import { supprimerMonCompte, type EtatSuppression } from "./actions";

// Revue du Jalon 24 (S10) : les copies gardées sur le téléphone (conversations, corrections, plan) sont effacées
// avant la suppression du compte, comme à la déconnexion ; sinon elles resteraient lisibles hors ligne.
async function supprimerPartout(etat: EtatSuppression, donnees: FormData) {
  const confirme =
    String(donnees.get("confirmation") ?? "")
      .trim()
      .toUpperCase() === "SUPPRIMER";
  if (confirme) await effacerDonneesLocales();
  return supprimerMonCompte(etat, donnees);
}

export function FormulaireSuppression() {
  const [etat, action, enCours] = useActionState(supprimerPartout, undefined);
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
