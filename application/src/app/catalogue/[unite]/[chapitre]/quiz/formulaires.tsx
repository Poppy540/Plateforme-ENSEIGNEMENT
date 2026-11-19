"use client";

import { useActionState } from "react";
import type { QuestionEleve } from "@/lib/agents/evaluateur/quiz";
import { contester, envoyerReponses } from "./actions";

function Messages({ etat }: { etat: { erreur?: string; succes?: string } | undefined }) {
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

export function FormulaireQuizEleve({
  unite,
  chapitre,
  quiz,
  questions,
}: {
  unite: string;
  chapitre: string;
  quiz: string;
  questions: QuestionEleve[];
}) {
  const [etat, action, enCours] = useActionState(envoyerReponses, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="unite" value={unite} />
      <input type="hidden" name="chapitre" value={chapitre} />
      <input type="hidden" name="quiz" value={quiz} />
      {questions.map((q, i) => (
        <fieldset key={i}>
          <legend>
            Question {i + 1} : {q.enonce}
          </legend>
          {q.type === "reponse_courte" ? (
            <textarea
              name={`reponse-${i}`}
              rows={3}
              maxLength={500}
              aria-label={`Ta réponse à la question ${i + 1}`}
            />
          ) : (
            q.options.map((o, j) => (
              <label key={j}>
                <input type="radio" name={`reponse-${i}`} value={j} /> {o}
              </label>
            ))
          )}
        </fieldset>
      ))}
      <Messages etat={etat} />
      <p className="note">
        Tu n&apos;as qu&apos;une tentative : ton score est enregistré une seule fois. Explique ta
        démarche dans les réponses courtes.
      </p>
      <div className="actions">
        <button type="submit" disabled={enCours}>
          {enCours ? "Correction en cours…" : "Envoyer mes réponses"}
        </button>
      </div>
    </form>
  );
}

export function FormulaireContestation({
  unite,
  chapitre,
  quiz,
  question,
}: {
  unite: string;
  chapitre: string;
  quiz: string;
  question: number;
}) {
  const [etat, action, enCours] = useActionState(contester, undefined);
  return (
    <details>
      <summary>Je conteste cette correction</summary>
      <form action={action} className="formulaire">
        <input type="hidden" name="unite" value={unite} />
        <input type="hidden" name="chapitre" value={chapitre} />
        <input type="hidden" name="quiz" value={quiz} />
        <input type="hidden" name="question" value={question} />
        <label htmlFor={`contestation-${question}`}>Explique pourquoi</label>
        <textarea
          id={`contestation-${question}`}
          name="message"
          rows={3}
          maxLength={1000}
          required
        />
        <Messages etat={etat} />
        <div className="actions">
          <button type="submit" className="secondaire" disabled={enCours}>
            {enCours ? "Réexamen en cours…" : "Envoyer ma contestation"}
          </button>
        </div>
      </form>
    </details>
  );
}
