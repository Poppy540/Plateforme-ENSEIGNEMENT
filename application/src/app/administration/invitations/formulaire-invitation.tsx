"use client";

import { useActionState } from "react";
import type { OptionInvitation } from "@/lib/serveur/invitations";
import { creer } from "./actions";

// Un formulaire par référentiel : ses familles de matières seulement. Le code n'existe que dans la réponse de
// l'action, affichée ici une seule fois (ni adresse, ni base, ni journal).
export function FormulaireInvitation({ option }: { option: OptionInvitation }) {
  const [etat, action, enCours] = useActionState(creer, undefined);
  const id = (nom: string) => `${option.referentiel}-${nom}`;
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="referentiel" value={option.referentiel} />
      <fieldset>
        <legend>Familles de matières que le référent validera</legend>
        {option.familles.map((f) => (
          <label key={f.code} className="case">
            <input type="checkbox" name="famille" value={f.code} /> {f.libelle}
          </label>
        ))}
      </fieldset>
      <label htmlFor={id("jours")}>Valable (jours, 1 à 60)</label>
      <input
        id={id("jours")}
        name="jours"
        type="number"
        min={1}
        max={60}
        defaultValue={14}
        required
      />
      <button type="submit" disabled={enCours}>
        Créer l&apos;invitation
      </button>
      {etat && !etat.ok && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      {etat?.ok && (
        <div role="status" className="code-unique">
          <p>
            Code d&apos;invitation (valable {etat.expireDans} jours) :{" "}
            <strong className="code">{etat.code}</strong>
          </p>
          <p>
            Notez-le maintenant : il ne sera <strong>plus jamais affiché</strong>. Transmettez-le au
            référent par un canal sûr (de vive voix, appel, message direct). Il l&apos;utilise sur
            la page « Accès enseignant-référent », après s&apos;être connecté.
          </p>
        </div>
      )}
    </form>
  );
}
