import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { rapportPourReferent } from "@/lib/serveur/coordinateur";
import { FormulaireClore, FormulaireProposition } from "../formulaires";

const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" });
const GRAVITE = { elevee: "élevée", moyenne: "moyenne", faible: "faible" } as const;
const TYPES: Record<string, string> = {
  rupture: "rupture de progression",
  notation: "notation",
  doublon: "doublon",
  hors_programme: "hors programme",
  erreur_factuelle: "erreur factuelle",
  sujet_sensible: "sujet sensible",
  question_defectueuse: "question à vérifier",
  donnees_insuffisantes: "données insuffisantes",
  instruction_cachee: "instruction cachée",
  autre: "autre",
};

// Rapport de cohérence du Coordinateur (brouillon) : le référent décide de chaque proposition (ADR 0038).
export default async function PageRapportCoordinateur({
  params,
}: PageProps<"/referent/coordinateur/[id]">) {
  const referent = await exigerReferent();
  const { id } = await params;
  const r = await rapportPourReferent(referent, id);
  if (!r) notFound();
  const decision = (nature: "lien" | "glossaire", indice: number) =>
    r.decisions.find((d) => d.nature === nature && d.indice === indice);
  const c = r.contenu;

  return (
    <main className="conteneur">
      <p>
        <Link href="/referent">← Espace référent</Link>
      </p>
      <h1>
        Revue de cohérence — {r.libelleFamille}, version {r.version}
      </h1>
      <p>
        Statut : <strong>{r.statut === "brouillon" ? "brouillon" : "traité"}</strong> · rédigé par
        le Coordinateur, une intelligence artificielle, le {formatDate.format(new Date(r.creeLe))}.
        Rien n&apos;est appliqué sans votre décision.
      </p>
      {c.refus && <p role="status">{c.refus}</p>}
      {c.synthese && <p>{c.synthese}</p>}
      {r.controles.length > 0 && (
        <>
          <h2>Contrôles de la plateforme</h2>
          <ul>
            {r.controles.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}

      <h2>Décisions demandées ({c.decisions.length})</h2>
      <ol>
        {c.decisions.map((d) => (
          <li key={d.question}>
            <strong>{d.question}</strong> — recommandation : {d.recommandation} (confiance{" "}
            {GRAVITE[d.confiance]})
          </li>
        ))}
      </ol>

      <h2>Constats ({c.constats.length})</h2>
      <ul>
        {c.constats.map((k, i) => (
          <li key={i}>
            {k.alerte_immediate && <strong>ALERTE · </strong>}
            <strong>{TYPES[k.type] ?? k.type}</strong> (gravité {GRAVITE[k.gravite]}, confiance{" "}
            {GRAVITE[k.confiance]}){k.chapitres.length > 0 && <> · {k.chapitres.join(", ")}</>} :{" "}
            {k.constat} — <em>{k.recommandation}</em>
          </li>
        ))}
      </ul>

      <h2>Liens de prérequis proposés ({c.propositions_liens.length})</h2>
      <p className="note">
        Accepter un lien l&apos;ajoute au graphe comme lien validé (la base refuse un cycle ou un
        prérequis d&apos;une classe supérieure).
      </p>
      <ul>
        {c.propositions_liens.map((l, i) => {
          const d = decision("lien", i);
          const nom = `${l.chapitre} ← ${l.prerequis}`;
          return (
            <li key={nom}>
              <strong>{nom}</strong> ({l.nature}) : {l.justification}
              {d ? (
                <p role="status">
                  {d.decision === "acceptee" ? "Accepté" : "Écarté"}
                  {d.commentaire && <> — {d.commentaire}</>}
                </p>
              ) : (
                r.statut === "brouillon" && (
                  <FormulaireProposition
                    rapport={r.id}
                    indice={i}
                    accepter="accepter_lien"
                    ecarter="ecarter_lien"
                    libelleAccepter="Accepter le lien"
                    nom={nom}
                  />
                )
              )}
            </li>
          );
        })}
      </ul>

      <h2>Glossaire et notations proposés ({c.glossaire.length})</h2>
      {c.glossaire.length > 0 && (
        <>
          <div
            className="tableau-defilant"
            role="region"
            aria-label="Glossaire et notations proposés"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>Terme</th>
                  <th>Définition</th>
                  <th>Niveaux</th>
                  <th>Notation</th>
                </tr>
              </thead>
              <tbody>
                {c.glossaire.map((g) => (
                  <tr key={g.terme}>
                    <td>{g.terme}</td>
                    <td>{g.definition}</td>
                    <td>{g.niveaux.join(", ")}</td>
                    <td>{g.notation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {decision("glossaire", 0) ? (
            <p role="status">
              Glossaire {decision("glossaire", 0)!.decision === "acceptee" ? "adopté" : "écarté"}
            </p>
          ) : (
            r.statut === "brouillon" && (
              <FormulaireProposition
                rapport={r.id}
                indice={0}
                accepter="adopter_glossaire"
                ecarter="ecarter_glossaire"
                libelleAccepter="Adopter comme charte de la famille"
                nom="glossaire"
              />
            )
          )}
        </>
      )}

      <h2>Plan de production proposé</h2>
      {c.plan_production.length === 0 ? (
        <p className="note">Aucun plan (ou plan écarté par les contrôles).</p>
      ) : (
        <ol>
          {c.plan_production.map((p) => (
            <li key={p.chapitre}>
              {p.chapitre} — {p.raison}
            </li>
          ))}
        </ol>
      )}

      {c.classement.length > 0 && (
        <>
          <h2>Classement universel / adaptable / local</h2>
          <ul>
            {c.classement.map((k) => (
              <li key={k.chapitre}>
                {k.chapitre} : {k.couche} (confiance {GRAVITE[k.confiance]}) — {k.raison}
              </li>
            ))}
          </ul>
        </>
      )}

      {r.statut === "brouillon" && <FormulaireClore rapport={r.id} />}
    </main>
  );
}
