import Link from "next/link";
import { seDeconnecter } from "../connexion/actions";
import { FormulaireDeconnexion } from "../composants/hors-ligne";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { famillesDuReferent, rapportsDuReferent } from "@/lib/serveur/coordinateur";
import { liensAValider, tableauReferent } from "@/lib/serveur/referent";
import { FormulaireRevue } from "./coordinateur/formulaires";
import { quizARelire } from "@/lib/serveur/evaluateur";
import { scriptsARelire } from "@/lib/serveur/scenariste";
import { videosPourTableau } from "@/lib/serveur/videos";
import { accueilVu, chapitresPiloteDuReferent } from "@/lib/serveur/pilote";
import { commencer } from "./accueil/actions";

const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" });

export default async function PageReferent() {
  const utilisateur = await exigerReferent();
  const premiereVisite = !(await accueilVu(utilisateur));
  const pilote = await chapitresPiloteDuReferent(utilisateur);
  const tableau = await tableauReferent(utilisateur);
  const scripts = await scriptsARelire(utilisateur);
  const quiz = await quizARelire(utilisateur);
  const videos = await videosPourTableau(utilisateur);
  const liens = await liensAValider(utilisateur);
  const familles = await famillesDuReferent(utilisateur);
  const rapports = await rapportsDuReferent(utilisateur);

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

      {premiereVisite ? (
        <section aria-labelledby="bienvenue" className="encadre">
          <h2 id="bienvenue">Bienvenue</h2>
          <p>
            Commencez par les <strong>chapitres du pilote</strong> ci-dessous : pour chacun, la
            prochaine action est indiquée. L&apos;accueil explique l&apos;ordre (programme,
            prérequis, script, quiz, vidéo) et le temps à prévoir.
          </p>
          <p>
            <Link href="/referent/accueil">Lire l&apos;accueil (2 minutes)</Link>
          </p>
          <form action={commencer}>
            <button type="submit" className="secondaire">
              J&apos;ai compris, ne plus afficher
            </button>
          </form>
        </section>
      ) : (
        <p>
          <Link href="/referent/accueil">
            Revoir l&apos;accueil : par où commencer, dans quel ordre
          </Link>
        </p>
      )}

      <h2>Chapitres du pilote ({pilote.length})</h2>
      {pilote.length === 0 ? (
        <p>Aucun chapitre du pilote dans vos familles pour l&apos;instant.</p>
      ) : (
        <ul className="liste-cartes" aria-label="Chapitres du pilote">
          {pilote.map((c) => (
            <li key={c.chapitre_id} className="carte">
              <strong>{c.titre}</strong>
              <span className="note">
                {c.unite} — {c.action.faites} étape{c.action.faites > 1 ? "s" : ""} sur 4 faites
              </span>
              {c.action.lien ? (
                <Link href={c.action.lien}>Prochaine action : {c.action.libelle}</Link>
              ) : (
                <span>
                  <strong>{c.action.libelle}</strong>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

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
                {c.pilote && " · pilote"}
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

      <p>
        <Link href="/referent/conformite">Conformité au programme officiel</Link>{" "}
        <span className="note">(documents officiels et rapports d&apos;écart)</span>
      </p>
      <p>
        <Link href="/espace/mes-donnees">Mes données</Link>
      </p>

      <h2>Coordinateur de famille</h2>
      <p className="note">
        Le Coordinateur (une intelligence artificielle) vérifie la cohérence de la famille
        d&apos;une classe à l&apos;autre et vous propose des brouillons : rien n&apos;est appliqué
        sans votre décision.
      </p>
      {familles.map((f, i) => (
        <FormulaireRevue
          key={f.famille}
          famille={f.famille}
          libelle={tableau.familles[i] ?? f.famille}
        />
      ))}
      {rapports.length > 0 && (
        <ul>
          {rapports.map((r) => (
            <li key={r.id}>
              <Link href={`/referent/coordinateur/${r.id}`}>
                Revue {r.famille} version {r.version}
              </Link>{" "}
              — {r.statut === "brouillon" ? "à traiter" : "traitée"},{" "}
              {formatDate.format(new Date(r.creeLe))}
            </li>
          ))}
        </ul>
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
                {s.pilote && " · pilote"}
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
                {v.pilote && " · pilote"}
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
                {q.pilote && " · pilote"}
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

      <FormulaireDeconnexion action={seDeconnecter} />
    </main>
  );
}
