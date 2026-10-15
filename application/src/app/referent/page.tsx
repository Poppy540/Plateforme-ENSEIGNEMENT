import Link from "next/link";
import { seDeconnecter } from "../connexion/actions";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { liensAValider, tableauReferent } from "@/lib/serveur/referent";
import { quizARelire } from "@/lib/serveur/evaluateur";
import { scriptsARelire } from "@/lib/serveur/scenariste";
import { videosPourTableau } from "@/lib/serveur/videos";

const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" });

export default async function PageReferent() {
  const utilisateur = await exigerReferent();
  const tableau = await tableauReferent(utilisateur);
  const scripts = await scriptsARelire(utilisateur);
  const quiz = await quizARelire(utilisateur);
  const videos = await videosPourTableau(utilisateur);
  const liens = await liensAValider(utilisateur);

  return (
    <main className="conteneur">
      <h1>Espace enseignant-référent</h1>
      <p>
        Bonjour {tableau.prenom}. Familles de matières :{" "}
        <strong>{tableau.familles.join(", ")}</strong>.
      </p>
      <p className="note">
        Rien n&apos;est montré aux élèves sans votre validation. Une validation porte sur la version
        que vous avez lue : si le chapitre change, il revient ici.
      </p>

      <h2>À valider ({tableau.aValider.length})</h2>
      {tableau.aValider.length === 0 && <p>Aucun chapitre en attente.</p>}
      <ul className="liste-cartes">
        {tableau.aValider.map((c) => (
          <li key={c.id}>
            <Link href={`/referent/chapitres/${c.id}`} className="carte">
              <span className="note">
                {c.matiere} — {c.niveau}
                {c.series.length > 0 && ` ${c.series.join("/")}`} · chapitre {c.ordre} · version{" "}
                {c.version}
              </span>
              <strong>{c.titre}</strong>
            </Link>
          </li>
        ))}
      </ul>

      <h2>Liens de prérequis à valider ({liens.length})</h2>
      {liens.length === 0 && <p>Aucun lien en attente.</p>}
      {liens.length > 0 && (
        <p>
          <Link href="/referent/prerequis">Voir les liens à valider</Link>
        </p>
      )}

      <h2>Scripts à relire ({scripts.length})</h2>
      {scripts.length === 0 && <p>Aucun script en attente.</p>}
      <ul className="liste-cartes">
        {scripts.map((s) => (
          <li key={s.id}>
            <Link href={`/referent/scripts/${s.id}`} className="carte">
              <span className="note">
                {s.unite} · version {s.version}
                {s.aRelireEnPriorite && " · à relire en priorité"}
              </span>
              <strong>Script : {s.chapitreTitre}</strong>
            </Link>
          </li>
        ))}
      </ul>

      <h2>Vidéos à relire ou à publier ({videos.length})</h2>
      {videos.length === 0 && <p>Aucune vidéo en attente.</p>}
      <ul className="liste-cartes">
        {videos.map((v) => (
          <li key={v.id}>
            <Link href={`/referent/videos/${v.id}`} className="carte">
              <span className="note">
                {v.unite} · script version {v.scriptVersion} ·{" "}
                {v.statut === "a_relire" ? "à relire" : "validée, à publier"}
              </span>
              <strong>Vidéo : {v.chapitreTitre}</strong>
            </Link>
          </li>
        ))}
      </ul>

      <h2>Quiz à relire ({quiz.length})</h2>
      {quiz.length === 0 && <p>Aucun quiz en attente.</p>}
      <ul className="liste-cartes">
        {quiz.map((q) => (
          <li key={q.id}>
            <Link href={`/referent/quiz/${q.id}`} className="carte">
              <span className="note">
                {q.unite} · version {q.version}
                {q.questionsSignalees > 0 && ` · ${q.questionsSignalees} question(s) signalée(s)`}
              </span>
              <strong>Quiz : {q.chapitreTitre}</strong>
            </Link>
          </li>
        ))}
      </ul>

      {tableau.decisionsRecentes.length > 0 && (
        <>
          <h2>Mes dernières décisions</h2>
          <ul>
            {tableau.decisionsRecentes.map((d) => (
              <li key={`${d.unite}-${d.titre}-${d.decideLe}`}>
                {d.decision === "valide" ? "Validé" : "Rejeté"} : {d.titre} ({d.unite}) —{" "}
                {formatDate.format(new Date(d.decideLe))}
              </li>
            ))}
          </ul>
        </>
      )}

      <form action={seDeconnecter}>
        <button type="submit" className="secondaire">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
