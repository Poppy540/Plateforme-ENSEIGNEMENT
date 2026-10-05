import Link from "next/link";
import { notFound } from "next/navigation";
import { estSimulee, sourcesLecture } from "@/lib/production-video/lecture";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { videoPourReferent } from "@/lib/serveur/videos";
import { LecteurVideo } from "../../../composants/lecteur-video";
import { FormulaireDecisionContenu } from "../../formulaires-contenu";
import { deciderSurVideo } from "./actions";
import { FormulairePublication } from "./formulaire-publication";

const LIBELLES = {
  a_relire: "À relire",
  validee: "Validée (non publiée)",
  rejetee: "Rejetée",
  publiee: "Publiée",
} as const;
const RESULTATS_CONTROLE = { ok: "conforme", anomalie: "anomalie", non_verifiable: "à vérifier" };
const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" });

export default async function PageVideoReferent({ params }: PageProps<"/referent/videos/[id]">) {
  const utilisateur = await exigerReferent();
  const { id } = await params;
  const v = await videoPourReferent(utilisateur, id);
  if (!v) notFound();
  const r = v.rapport;

  return (
    <main className="conteneur">
      <p>
        <Link href={`/referent/scripts/${v.scriptId}`}>← Script de « {v.chapitreTitre} »</Link>
      </p>
      <p className="note">
        {v.unite} · script version {v.scriptVersion} · produite le{" "}
        {formatDate.format(new Date(v.creeLe))}
      </p>
      <h1>Vidéo : {v.chapitreTitre}</h1>
      <p>
        Statut : <strong>{LIBELLES[v.statut]}</strong> · {v.dureeSecondes} s ·{" "}
        {v.coutUSD.toFixed(2)} USD
      </p>
      <p className="note">
        Produite par la chaîne de production (services {r.services}) à partir du script validé, sans
        modification du texte. Aucun élève ne la voit avant votre publication.
      </p>

      <LecteurVideo
        videoId={v.id}
        sources={sourcesLecture(v.reference, r.fichiers?.versions ?? [])}
        dureeSecondes={v.dureeSecondes}
        sousTitres={!!r.sousTitresVtt}
        simulation={estSimulee(v.reference)}
      />

      <h2>Rapport de production</h2>
      <ul>
        {r.controles.map((c) => (
          <li key={c.controle}>
            {c.controle} : <strong>{RESULTATS_CONTROLE[c.resultat]}</strong> — {c.detail}
          </li>
        ))}
      </ul>
      {r.anomalies.length > 0 && (
        <>
          <h3>Anomalies</h3>
          <ul>
            {r.anomalies.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </>
      )}
      <p className="note">
        Versions :{" "}
        {r.fichiers?.versions.map((x) => `${x.qualite} (${x.debitKbps} kbit/s)`).join(", ")}
      </p>

      <h2>Décision</h2>
      {v.statut === "a_relire" && (
        <FormulaireDecisionContenu
          id={v.id}
          version={v.scriptVersion}
          action={deciderSurVideo}
          pointsSignales
          libelleVerification="J'ai regardé toute la vidéo avec les sous-titres et vérifié la synchronisation, le son, la lisibilité et les anomalies du rapport."
        />
      )}
      {v.statut === "validee" && (
        <>
          <p>Vidéo validée. La publication est un acte distinct :</p>
          <FormulairePublication id={v.id} />
        </>
      )}
      {v.statut === "rejetee" && (
        <p className="note">
          Vidéo rejetée. Relancez la production depuis le script, ou faites réviser le script.
        </p>
      )}
      {v.statut === "publiee" && <p>Vidéo publiée : visible par les élèves du chapitre.</p>}
      {v.historique.map((h) => (
        <p key={h.decideLe}>
          {h.objet === "publication_video" ? (
            <>
              <strong>Publiée</strong> par {h.valideur ?? "?"}
            </>
          ) : (
            <>
              <strong>{h.decision === "valide" ? "Validée" : "Rejetée"}</strong> par{" "}
              {h.valideur ?? "?"}
            </>
          )}{" "}
          le {formatDate.format(new Date(h.decideLe))}
          {h.commentaire && <> — « {h.commentaire} »</>}
        </p>
      ))}
    </main>
  );
}
