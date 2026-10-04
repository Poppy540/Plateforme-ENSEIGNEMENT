import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { chapitrePourReferent } from "@/lib/serveur/referent";
import { FormulaireDecision } from "./formulaire-decision";

const LIBELLES = { a_valider: "À valider", valide: "Validé", rejete: "Rejeté" } as const;
const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" });

export default async function PageChapitreReferent({
  params,
}: PageProps<"/referent/chapitres/[id]">) {
  const utilisateur = await exigerReferent();
  const { id } = await params;
  const chapitre = await chapitrePourReferent(utilisateur, id);
  if (!chapitre) notFound();

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
