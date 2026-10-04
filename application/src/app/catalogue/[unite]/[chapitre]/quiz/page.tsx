import Link from "next/link";
import { notFound } from "next/navigation";
import type { Correction } from "@/lib/agents/evaluateur/correction";
import { exigerEleveActif } from "@/lib/serveur/acces-eleve";
import { CONTESTATIONS_MAX, quizPourEleve } from "@/lib/serveur/evaluateur";
import { contexteChapitre } from "@/lib/serveur/professeur";
import { FormulaireContestation, FormulaireQuizEleve } from "./formulaires";

const RESULTATS = {
  juste: "Juste",
  partiel: "En partie juste",
  faux: "À revoir",
  non_tente: "Pas de réponse",
} as const;

function Retour({ c }: { c: Correction }) {
  return (
    <>
      {c.ce_qui_est_juste && <p>Ce qui est juste : {c.ce_qui_est_juste}</p>}
      {c.erreur && <p>Ce qui coince : {c.erreur}</p>}
      {c.notion_a_revoir && <p>À revoir : {c.notion_a_revoir}</p>}
      {c.conseil && <p>Conseil : {c.conseil}</p>}
      {c.message_a_l_eleve && <p>{c.message_a_l_eleve}</p>}
    </>
  );
}

export default async function PageQuiz({
  params,
}: PageProps<"/catalogue/[unite]/[chapitre]/quiz">) {
  const utilisateur = await exigerEleveActif();
  const { unite, chapitre } = await params;
  const contexte = await contexteChapitre(utilisateur, unite, chapitre);
  if (!contexte) notFound();
  const quiz = await quizPourEleve(contexte);
  if (!quiz) notFound();
  const t = quiz.tentative;

  return (
    <main className="conteneur">
      <p>
        <Link href={`/catalogue/${unite}/${chapitre}`}>← {contexte.chapitreTitre}</Link>
      </p>
      <h1>Quiz : {contexte.chapitreTitre}</h1>
      <p className="note">
        Quiz préparé par l&apos;Évaluateur (une IA) et validé par un enseignant. Il sert à voir ce
        que tu as compris et quoi retravailler.
      </p>

      {!t ? (
        <FormulaireQuizEleve
          unite={unite}
          chapitre={chapitre}
          quiz={quiz.quizId}
          questions={quiz.questions}
        />
      ) : (
        <>
          <p role="status">
            Ton score : <strong>{t.score} / 100</strong> (enregistré).
          </p>
          {t.questions.map((q, i) => {
            const r = t.reponses.find((x) => x.question === i);
            const contestations = t.contestations.filter((c) => c.question === i);
            return (
              <section key={i}>
                <h2>
                  Question {i + 1} : {r ? RESULTATS[r.correction.resultat] : "—"}
                </h2>
                <p>{q.enonce}</p>
                <p className="note">
                  Ta réponse :{" "}
                  {r?.texte ?? (r?.choix != null ? q.options[Number(r.choix)] : "(pas de réponse)")}
                </p>
                {q.type !== "reponse_courte" && <p>Bonne réponse : {q.options[q.bonne_reponse]}</p>}
                <p>Explication : {q.explication}</p>
                {r && <Retour c={r.correction} />}
                {contestations.map((c, j) => (
                  <div key={j}>
                    <p className="note">Ta contestation : « {c.message} »</p>
                    {c.reexamen && <Retour c={c.reexamen} />}
                  </div>
                ))}
                {contestations.length < CONTESTATIONS_MAX ? (
                  <FormulaireContestation
                    unite={unite}
                    chapitre={chapitre}
                    quiz={quiz.quizId}
                    question={i}
                  />
                ) : (
                  <p className="note">Ta contestation a été transmise à un enseignant.</p>
                )}
              </section>
            );
          })}
          <p className="note">
            Le score ne change pas après une contestation : si le quiz contient une erreur, un
            enseignant la corrigera.
          </p>
        </>
      )}
    </main>
  );
}
