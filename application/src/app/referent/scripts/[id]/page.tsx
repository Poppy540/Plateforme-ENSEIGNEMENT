import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { scriptPourReferent } from "@/lib/serveur/scenariste";
import { FormulaireDecisionScript, FormulaireRevision } from "./formulaires";

const LIBELLES = { brouillon: "Brouillon", valide: "Validé", rejete: "Rejeté" } as const;
const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" });
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;

/** Met en évidence les points [À VÉRIFIER] dans le texte. */
function AvecPointsAVerifier({ texte }: { texte: string }) {
  return texte
    .split(/(\[À VÉRIFIER\])/i)
    .map((morceau, i) =>
      /^\[À VÉRIFIER\]$/i.test(morceau) ? (
        <mark key={i}>{morceau}</mark>
      ) : (
        <Fragment key={i}>{morceau}</Fragment>
      ),
    );
}

function Liste({ titre, elements }: { titre: string; elements: string[] }) {
  if (elements.length === 0) return null;
  return (
    <>
      <h3>{titre}</h3>
      <ul>
        {elements.map((e, i) => (
          <li key={i}>
            <AvecPointsAVerifier texte={e} />
          </li>
        ))}
      </ul>
    </>
  );
}

export default async function PageScriptReferent({ params }: PageProps<"/referent/scripts/[id]">) {
  const utilisateur = await exigerReferent();
  const { id } = await params;
  const script = await scriptPourReferent(utilisateur, id);
  if (!script) notFound();
  const c = script.contenu;

  return (
    <main className="conteneur">
      <p>
        <Link href={`/referent/chapitres/${script.chapitreId}`}>← {script.chapitreTitre}</Link>
      </p>
      <p className="note">
        {script.unite} · script version {script.version} · empreinte{" "}
        <code>{script.empreinte.slice(0, 12)}</code>
      </p>
      <h1>Script : {script.chapitreTitre}</h1>
      <p>
        Statut : <strong>{LIBELLES[script.statut]}</strong> · durée cible {script.dureeCibleMinutes}{" "}
        min
      </p>
      <p className="note">
        Rédigé par l&apos;agent Scénariste (IA). Rien n&apos;est publié sans votre validation.
      </p>
      {c.a_relire_en_priorite && (
        <p role="alert" className="erreur">
          À relire en priorité : {c.motif_priorite}
        </p>
      )}
      {c.message_au_referent && <p>Message du Scénariste : {c.message_au_referent}</p>}
      {c.consigne && <p className="note">Votre consigne : « {c.consigne} »</p>}
      {c.revision_de && <p className="note">Révision d&apos;une version précédente.</p>}

      {c.sections.map((s, i) => (
        <section key={i}>
          <h2>
            {i + 1}. {s.titre}{" "}
            <span className="note">
              ({mmss(s.debut_secondes)}, {s.duree_secondes} s)
            </span>
          </h2>
          <p>
            <AvecPointsAVerifier texte={s.texte_parle} />
          </p>
          <p className="note">À l&apos;écran : {s.indications_visuelles}</p>
        </section>
      ))}

      <h2>Travaux pratiques</h2>
      <Liste titre="Consignes" elements={c.travaux_pratiques.consignes} />
      <Liste titre="Matériel" elements={c.travaux_pratiques.materiel} />
      <Liste titre="Sécurité" elements={c.travaux_pratiques.securite} />
      <Liste titre="Idées de questions de contrôle" elements={c.idees_questions_controle} />
      <Liste titre="Glossaire" elements={c.glossaire.map((g) => `${g.terme} : ${g.definition}`)} />
      <Liste titre="Points [À VÉRIFIER]" elements={c.points_a_verifier} />
      <Liste titre="Exemples locaux à valider" elements={c.exemples_locaux_a_valider} />
      <Liste titre="Signalements sur le programme" elements={c.signalements_programme} />

      <h2>Décision</h2>
      {script.statut === "brouillon" ? (
        <FormulaireDecisionScript
          id={script.id}
          version={script.version}
          pointsSignales={
            c.points_a_verifier.length > 0 ||
            c.exemples_locaux_a_valider.length > 0 ||
            c.a_relire_en_priorite
          }
        />
      ) : (
        <p className="note">
          {script.statut === "valide"
            ? "Version validée : elle peut être envoyée en production vidéo. Toute correction passe par une nouvelle version."
            : "Version rejetée. Demandez une révision ci-dessous."}
        </p>
      )}
      {script.historique.map((h) => (
        <p key={h.decideLe}>
          Version {script.version}{" "}
          <strong>{h.decision === "valide" ? "validée" : "rejetée"}</strong> par {h.valideur ?? "?"}{" "}
          le {formatDate.format(new Date(h.decideLe))}
          {h.commentaire && <> — « {h.commentaire} »</>}
        </p>
      ))}

      <h2>Demander une révision</h2>
      <FormulaireRevision
        id={script.id}
        chapitre={script.chapitreId}
        duree={script.dureeCibleMinutes}
        corrections={script.historique.find((h) => h.decision === "rejete")?.commentaire ?? ""}
      />
    </main>
  );
}
