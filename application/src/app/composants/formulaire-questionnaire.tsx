"use client";

import { useActionState } from "react";
import { ECHELLE, type QuestionnaireOuvert } from "@/lib/exploitation/mesures";

export type EtatQuestionnaire = { erreur?: string; merci?: boolean } | undefined;

/**
 * Questionnaire anonyme (ADR 0052) : réponses fermées seulement, toutes obligatoires. Les réponses ne sont pas
 * rattachées au compte ; seuls des totaux sont lus, à partir de 5 réponses.
 */
export function FormulaireQuestionnaire({
  questionnaire,
  action,
  jeton,
  tutoiement,
}: {
  questionnaire: QuestionnaireOuvert;
  action: (etat: EtatQuestionnaire, donnees: FormData) => Promise<EtatQuestionnaire>;
  jeton?: string;
  tutoiement: boolean;
}) {
  const [etat, envoyer, enCours] = useActionState(action, undefined);
  if (etat?.merci)
    return (
      <p role="status">{tutoiement ? "Merci pour tes réponses !" : "Merci pour vos réponses !"}</p>
    );
  return (
    <form action={envoyer} className="formulaire questionnaire">
      {jeton && <input type="hidden" name="jeton" value={jeton} />}
      {questionnaire.questions.map((q) => (
        <fieldset key={q.id}>
          <legend>{q.texte}</legend>
          {q.options.map((o, i) => (
            <label key={o}>
              <input type="radio" name={`q_${q.id}`} value={o} required />{" "}
              {q.type === "echelle" ? `${o} — ${ECHELLE[i]}` : o}
            </label>
          ))}
        </fieldset>
      ))}
      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      <div className="actions">
        <button type="submit" disabled={enCours}>
          Envoyer mes réponses
        </button>
      </div>
    </form>
  );
}
