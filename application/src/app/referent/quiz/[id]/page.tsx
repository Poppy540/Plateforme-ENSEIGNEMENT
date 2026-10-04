import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { quizPourReferent } from "@/lib/serveur/evaluateur";
import { FormulaireDecisionContenu, FormulaireRevisionContenu } from "../../formulaires-contenu";
import { deciderSurQuiz, demanderRevisionQuiz } from "./actions";

const LIBELLES = { brouillon: "Brouillon", valide: "Validé", rejete: "Rejeté" } as const;
const TYPES = { qcm: "QCM", vrai_faux: "Vrai ou faux", reponse_courte: "Réponse courte" } as const;
const NATURES = {
  correcte: "bonne réponse",
  prerequis: "erreur de prérequis",
  confusion_chapitre: "confusion du chapitre",
} as const;
const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" });

export default async function PageQuizReferent({ params }: PageProps<"/referent/quiz/[id]">) {
  const utilisateur = await exigerReferent();
  const { id } = await params;
  const detail = await quizPourReferent(utilisateur, id);
  if (!detail) notFound();
  const q = detail.quiz;
  const signalees = new Map(q.questions_signalees.map((s) => [s.numero, s.motif]));
  const deduites = q.questions.some((x) => x.erreurs_deduites.length > 0);

  return (
    <main className="conteneur">
      <p>
        <Link href={`/referent/chapitres/${detail.chapitreId}`}>← {detail.chapitreTitre}</Link>
      </p>
      <p className="note">
        {detail.unite} · quiz version {detail.version} · empreinte{" "}
        <code>{detail.empreinte.slice(0, 12)}</code>
      </p>
      <h1>Quiz : {detail.chapitreTitre}</h1>
      <p>
        Statut : <strong>{LIBELLES[detail.statut]}</strong> · {q.questions.length} questions
      </p>
      <p className="note">
        Rédigé par l&apos;agent Évaluateur (IA). Les élèves ne voient le quiz qu&apos;après votre
        validation, et jamais les réponses avant d&apos;avoir répondu.
      </p>
      {q.message_au_referent && <p>Message de l&apos;Évaluateur : {q.message_au_referent}</p>}
      {q.composante && <p>Composante visée : {q.composante}</p>}
      {detail.consigne && <p className="note">Votre consigne : « {detail.consigne} »</p>}
      {detail.revisionDe && <p className="note">Révision d&apos;une version précédente.</p>}

      {q.questions.map((x, i) => (
        <section key={i}>
          <h2>
            Question {i + 1}{" "}
            <span className="note">
              ({TYPES[x.type]}, {x.difficulte})
            </span>
          </h2>
          {signalees.has(i + 1) && (
            <p role="alert" className="erreur">
              Signalée par l&apos;Évaluateur : {signalees.get(i + 1)}
            </p>
          )}
          <p>{x.enonce}</p>
          {x.options.length > 0 && (
            <ol type="A">
              {x.options.map((o, j) => (
                <li key={j}>
                  {j === x.bonne_reponse ? <strong>{o} (bonne réponse)</strong> : o}
                  {x.guide_reponses[j] && (
                    <span className="note">
                      {" "}
                      — {NATURES[x.guide_reponses[j].nature]} :{" "}
                      {x.guide_reponses[j].ce_que_fait_l_eleve} · ensuite :{" "}
                      {x.guide_reponses[j].etape_suivante}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
          {x.type === "reponse_courte" && <p>Réponse attendue : {x.reponse_attendue}</p>}
          <p>Explication : {x.explication}</p>
          <p className="note">
            Notion : {x.notion} · chapitre : {x.chapitre} · vérification : {x.verification}
          </p>
          {x.erreurs_deduites.length > 0 && (
            <p className="note">
              <mark>Erreurs déduites (non documentées)</mark> : {x.erreurs_deduites.join(" ; ")}
            </p>
          )}
        </section>
      ))}

      {q.points_a_valider.length > 0 && (
        <>
          <h2>Points à valider</h2>
          <ul>
            {q.points_a_valider.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </>
      )}

      {detail.statut === "valide" && (
        <>
          <h2>Statistiques d&apos;erreurs (anonymisées)</h2>
          {detail.statistiques.length === 0 ? (
            <p className="note">
              Pas encore de statistiques : elles apparaissent à partir de 5 tentatives, sans aucun
              résultat individuel.
            </p>
          ) : (
            <ul>
              {detail.statistiques.map((s) => (
                <li key={s.question}>
                  Question {s.question + 1} : {s.tauxReussite} % de réussite sur {s.tentatives}{" "}
                  réponses
                  {s.tauxReussite < 30 && (
                    <strong> — taux d&apos;échec anormal, à réexaminer</strong>
                  )}
                  {Object.keys(s.repartition).length > 0 && (
                    <span className="note">
                      {" "}
                      (réponses :{" "}
                      {Object.entries(s.repartition)
                        .map(([choix, n]) =>
                          choix === "texte"
                            ? `${n} rédigées ou vides`
                            : `${n} × ${q.questions[s.question]?.options[Number(choix)] ?? choix}`,
                        )
                        .join(", ")}
                      )
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <h2>Décision</h2>
      {detail.statut === "brouillon" ? (
        <FormulaireDecisionContenu
          id={detail.id}
          version={detail.version}
          action={deciderSurQuiz}
          pointsSignales={
            q.questions_signalees.length > 0 || q.points_a_valider.length > 0 || deduites
          }
        />
      ) : (
        <p className="note">
          {detail.statut === "valide"
            ? "Version validée : elle est proposée aux élèves du chapitre. Toute correction passe par une nouvelle version."
            : "Version rejetée. Demandez une révision ci-dessous."}
        </p>
      )}
      {detail.historique.map((h) => (
        <p key={h.decideLe}>
          Version {detail.version}{" "}
          <strong>{h.decision === "valide" ? "validée" : "rejetée"}</strong> par {h.valideur ?? "?"}{" "}
          le {formatDate.format(new Date(h.decideLe))}
          {h.commentaire && <> — « {h.commentaire} »</>}
        </p>
      ))}

      <h2>Demander une révision</h2>
      <FormulaireRevisionContenu
        id={detail.id}
        chapitre={detail.chapitreId}
        action={demanderRevisionQuiz}
        agent="l'Évaluateur"
        corrections={detail.historique.find((h) => h.decision === "rejete")?.commentaire ?? ""}
      >
        <input type="hidden" name="nombre" value={q.questions.length} />
      </FormulaireRevisionContenu>
    </main>
  );
}
