import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { chapitrePourReferent, prerequisDuChapitre } from "@/lib/serveur/referent";
import { quizDuChapitre } from "@/lib/serveur/evaluateur";
import { scriptsDuChapitre } from "@/lib/serveur/scenariste";
import { FormulaireDecision } from "./formulaire-decision";
import { FormulaireLien } from "./formulaire-lien";
import { FormulaireQuiz } from "./formulaire-quiz";
import { FormulaireScript } from "./formulaire-script";

const LIBELLES = { a_valider: "À valider", valide: "Validé", rejete: "Rejeté" } as const;
const LIBELLES_SCRIPT = { brouillon: "brouillon", valide: "validé", rejete: "rejeté" } as const;
const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" });

export default async function PageChapitreReferent({
  params,
  searchParams,
}: PageProps<"/referent/chapitres/[id]">) {
  const utilisateur = await exigerReferent();
  const { id } = await params;
  const chapitre = await chapitrePourReferent(utilisateur, id);
  if (!chapitre) notFound();
  const recherche = await searchParams;
  const revision = Number(recherche.revision);
  const revisionQuiz = Number(recherche.quiz);
  const scripts = chapitre.statut === "valide" ? await scriptsDuChapitre(utilisateur, id) : [];
  const quiz = chapitre.statut === "valide" ? await quizDuChapitre(utilisateur, id) : [];
  const prerequis = await prerequisDuChapitre(utilisateur, id);

  return (
    <main className="conteneur">
      <p>
        <Link href="/referent">← Chapitres à valider</Link>
      </p>
      <p className="note">
        {chapitre.matiere} — {chapitre.niveau} · {chapitre.unite} · chapitre {chapitre.ordre}
      </p>
      <h1>{chapitre.titre}</h1>
      <p>
        Statut : <strong>{LIBELLES[chapitre.statut]}</strong> · version {chapitre.version} ·
        empreinte <code>{chapitre.empreinte.slice(0, 12)}</code>
      </p>
      <h2>Sous-thèmes</h2>
      {chapitre.sousThemes.length > 0 ? (
        <ul>
          {chapitre.sousThemes.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      ) : (
        <p className="note">Aucun sous-thème indiqué.</p>
      )}
      <p>
        Volume horaire : {chapitre.volumeHoraire ?? "non indiqué"} · coefficient :{" "}
        {chapitre.coefficient ?? "non indiqué"}
      </p>

      {chapitre.statut === "a_valider" ? (
        <FormulaireDecision id={chapitre.id} version={chapitre.version} />
      ) : (
        <p className="note">Ce chapitre n&apos;est pas en attente de validation.</p>
      )}

      <section>
        <h2>Prérequis ({prerequis.length})</h2>
        <p className="note">
          Chapitres à maîtriser avant celui-ci, proposés par le pack (y compris d&apos;une classe
          inférieure). Seuls les liens validés servent au Tuteur, au Scénariste et à
          l&apos;Évaluateur.
        </p>
        {prerequis.length === 0 && <p className="note">Aucun prérequis proposé.</p>}
        <ul>
          {prerequis.map((p) => (
            <li key={p.prerequisId}>
              <Link href={`/referent/chapitres/${p.prerequisId}`}>{p.prerequisTitre}</Link> (
              {p.prerequisNiveau}, {p.nature === "strict" ? "indispensable" : "utile"}) :{" "}
              <strong>{LIBELLES[p.statut]}</strong>
              {p.commentaire && <> — {p.commentaire}</>}
              {p.statut === "a_valider" && (
                <FormulaireLien
                  chapitre={chapitre.id}
                  prerequis={p.prerequisId}
                  titre={p.prerequisTitre}
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      {chapitre.statut === "valide" && (
        <section>
          <h2>Scripts de cours vidéo</h2>
          {Number.isInteger(revision) && revision > 0 && (
            <p role="status">Version {revision} créée par révision : à relire.</p>
          )}
          {scripts.length === 0 ? (
            <p className="note">Aucun script pour ce chapitre.</p>
          ) : (
            <ul>
              {scripts.map((s) => (
                <li key={s.id}>
                  <Link href={`/referent/scripts/${s.id}`}>Version {s.version}</Link> —{" "}
                  {LIBELLES_SCRIPT[s.statut]}, {s.dureeCibleMinutes} min, créée le{" "}
                  {formatDate.format(new Date(s.creeLe))}
                  {s.aRelireEnPriorite && <strong> — à relire en priorité</strong>}
                </li>
              ))}
            </ul>
          )}
          <FormulaireScript chapitre={chapitre.id} dureeParDefaut={10} />
        </section>
      )}

      {chapitre.statut === "valide" && (
        <section>
          <h2>Quiz</h2>
          {Number.isInteger(revisionQuiz) && revisionQuiz > 0 && (
            <p role="status">Quiz version {revisionQuiz} créé par révision : à relire.</p>
          )}
          {quiz.length === 0 ? (
            <p className="note">Aucun quiz pour ce chapitre.</p>
          ) : (
            <ul>
              {quiz.map((q) => (
                <li key={q.id}>
                  <Link href={`/referent/quiz/${q.id}`}>Quiz version {q.version}</Link> —{" "}
                  {LIBELLES_SCRIPT[q.statut]}, {q.nombreQuestions} questions, créé le{" "}
                  {formatDate.format(new Date(q.creeLe))}
                  {q.questionsSignalees > 0 && (
                    <strong> — {q.questionsSignalees} question(s) signalée(s)</strong>
                  )}
                </li>
              ))}
            </ul>
          )}
          <FormulaireQuiz chapitre={chapitre.id} />
        </section>
      )}

      <h2>Historique</h2>
      {chapitre.historique.length === 0 && (
        <p className="note">Aucune décision pour l&apos;instant.</p>
      )}
      <ul>
        {chapitre.historique.map((h) => (
          <li key={h.decideLe}>
            Version {h.version} : <strong>{h.decision === "valide" ? "validée" : "rejetée"}</strong>{" "}
            par {h.valideur ?? "?"} le {formatDate.format(new Date(h.decideLe))}
            {h.commentaire && <> — « {h.commentaire} »</>}
          </li>
        ))}
      </ul>
    </main>
  );
}
