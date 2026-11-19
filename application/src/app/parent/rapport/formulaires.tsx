"use client";

import { useActionState } from "react";
import { arreter, demanderMaintenant, poserQuestion, type EtatParent } from "./actions";

function Messages({ etat }: { etat: EtatParent }) {
  return (
    <>
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      {etat?.succes && <p role="status">{etat.succes}</p>}
      {etat?.reponse && <p role="status">Réponse du tuteur : {etat.reponse}</p>}
    </>
  );
}

export function ActionsParent({ jeton, actif }: { jeton: string; actif: boolean }) {
  const [etatDemande, demander, enDemande] = useActionState(demanderMaintenant, undefined);
  const [etatArret, stopper, enArret] = useActionState(arreter, undefined);
  const [etatQuestion, questionner, enQuestion] = useActionState(poserQuestion, undefined);
  return (
    <>
      <form action={questionner} className="formulaire">
        <input type="hidden" name="jeton" value={jeton} />
        <label htmlFor="question">Une question au tuteur de votre enfant</label>
        <textarea id="question" name="question" rows={3} maxLength={500} required />
        <Messages etat={etatQuestion} />
        <div className="actions">
          <button type="submit" className="secondaire" disabled={enQuestion}>
            Poser la question
          </button>
        </div>
      </form>
      {actif && (
        <>
          <form action={demander} className="formulaire">
            <input type="hidden" name="jeton" value={jeton} />
            <Messages etat={etatDemande} />
            <button type="submit" className="secondaire" disabled={enDemande}>
              Recevoir un nouveau rapport maintenant
            </button>
          </form>
          <form action={stopper} className="formulaire">
            <input type="hidden" name="jeton" value={jeton} />
            <Messages etat={etatArret} />
            <button type="submit" className="secondaire" disabled={enArret}>
              Ne plus recevoir de rapports
            </button>
          </form>
        </>
      )}
    </>
  );
}
