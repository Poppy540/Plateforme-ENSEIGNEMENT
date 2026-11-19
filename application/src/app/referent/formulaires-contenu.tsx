"use client";

import { useActionState, type ReactNode } from "react";

// Formulaires communs aux contenus versionnés (scripts, quiz) : décision sur la version lue, révision par
// l'agent qui l'a rédigée (nouvelle version).

export type EtatFormulaire = { erreur?: string; succes?: string } | undefined;
type Action = (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;

function Messages({ etat }: { etat: EtatFormulaire }) {
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

export function FormulaireDecisionContenu({
  id,
  version,
  pointsSignales,
  action: agir,
  libelleVerification = "J'ai vérifié les points signalés (points à vérifier, exemples locaux, questions signalées, sujet sensible).",
}: {
  id: string;
  version: number;
  /** Points à vérifier, questions signalées ou sujet sensible : confirmation exigée avant validation. */
  pointsSignales: boolean;
  action: Action;
  libelleVerification?: string;
}) {
  const [etat, action, enCours] = useActionState(agir, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="a_verifier" value={pointsSignales ? "oui" : "non"} />
      {pointsSignales && (
        <label>
          <input type="checkbox" name="verifie" value="oui" /> {libelleVerification}
        </label>
      )}
      <label htmlFor="commentaire">Commentaire (obligatoire en cas de rejet)</label>
      <textarea id="commentaire" name="commentaire" rows={4} maxLength={2000} />
      <Messages etat={etat} />
      <div className="actions">
        <button type="submit" name="decision" value="valide" disabled={enCours}>
          Valider la version {version}
        </button>
        <button
          type="submit"
          name="decision"
          value="rejete"
          className="secondaire"
          disabled={enCours}
        >
          Rejeter
        </button>
      </div>
    </form>
  );
}

export function FormulaireRevisionContenu({
  id,
  chapitre,
  corrections,
  action: agir,
  agent,
  children,
}: {
  id: string;
  chapitre: string;
  corrections: string;
  action: Action;
  /** Nom de l'agent qui révise (« le Scénariste », « l'Évaluateur »). */
  agent: string;
  /** Champs propres au contenu (durée, nombre de questions…). */
  children?: ReactNode;
}) {
  const [etat, action, enCours] = useActionState(agir, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="chapitre" value={chapitre} />
      {children}
      <label htmlFor="corrections">Corrections attendues</label>
      <textarea
        id="corrections"
        name="consigne"
        rows={4}
        maxLength={1000}
        defaultValue={corrections}
        required
      />
      <Messages etat={etat} />
      <div className="actions">
        <button type="submit" className="secondaire" disabled={enCours}>
          {enCours ? "Révision en cours (1 à 3 minutes)…" : `Faire réviser par ${agent}`}
        </button>
      </div>
      <p className="note">La révision crée une nouvelle version, à relire et valider à son tour.</p>
    </form>
  );
}
