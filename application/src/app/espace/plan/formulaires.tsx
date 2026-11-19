"use client";

import { useActionState } from "react";
import { actualiser, enregistrer, proposerRapports, type EtatPlan } from "./actions";

function Messages({ etat }: { etat: EtatPlan }) {
  return (
    <>
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      {etat?.succes && <p role="status">{etat.succes}</p>}
    </>
  );
}

export function FormulairePreferences({
  minutes,
  connexion,
  rappels,
  frequence,
}: {
  minutes: number | null;
  connexion: string | null;
  rappels: boolean;
  frequence: string;
}) {
  const [etat, action, enCours] = useActionState(enregistrer, undefined);
  // Après l'envoi, React réinitialise le formulaire : une liste déroulante reviendrait à sa première valeur.
  // La clé remonte le formulaire avec les valeurs enregistrées.
  return (
    <form
      key={`${minutes}-${connexion}-${rappels}-${frequence}`}
      action={action}
      className="formulaire"
    >
      <label htmlFor="minutes">Temps disponible par jour (minutes)</label>
      <input
        id="minutes"
        name="minutes"
        type="number"
        min={5}
        max={240}
        defaultValue={minutes ?? ""}
      />
      <label htmlFor="connexion">Ta connexion</label>
      <select id="connexion" name="connexion" defaultValue={connexion ?? ""}>
        <option value="">Je ne sais pas</option>
        <option value="lente">Lente</option>
        <option value="moyenne">Moyenne</option>
        <option value="bonne">Bonne</option>
      </select>
      <label>
        <input type="checkbox" name="rappels" value="oui" defaultChecked={rappels} /> Recevoir des
        rappels de travail (désactivés par défaut)
      </label>
      <label htmlFor="frequence">Fréquence des rappels</label>
      <select id="frequence" name="frequence" defaultValue={frequence}>
        <option value="hebdomadaire">Une fois par semaine</option>
        <option value="quotidienne">Une fois par jour</option>
      </select>
      <Messages etat={etat} />
      <div className="actions">
        <button type="submit" className="secondaire" disabled={enCours}>
          Enregistrer mes préférences
        </button>
      </div>
    </form>
  );
}

export function FormulairePlan() {
  const [etat, action, enCours] = useActionState(actualiser, undefined);
  return (
    <form action={action} className="formulaire">
      <label htmlFor="message">Un mot pour ton tuteur (facultatif)</label>
      <textarea
        id="message"
        name="message"
        rows={3}
        maxLength={500}
        placeholder="Par exemple : j'ai un contrôle vendredi, j'ai du mal avec les fractions…"
      />
      <Messages etat={etat} />
      <div className="actions">
        <button type="submit" disabled={enCours}>
          {enCours ? "Préparation…" : "Mettre à jour mon plan"}
        </button>
      </div>
    </form>
  );
}

export function FormulaireRapports() {
  const [etat, action, enCours] = useActionState(proposerRapports, undefined);
  return (
    <form action={action} className="formulaire">
      <label htmlFor="contact">
        Contact du parent (seulement si tu n&apos;en as pas donné à l&apos;inscription)
      </label>
      <input id="contact" name="contact" type="text" maxLength={120} autoComplete="off" />
      <Messages etat={etat} />
      <div className="actions">
        <button type="submit" className="secondaire" disabled={enCours}>
          Proposer les rapports à mon parent
        </button>
      </div>
    </form>
  );
}
