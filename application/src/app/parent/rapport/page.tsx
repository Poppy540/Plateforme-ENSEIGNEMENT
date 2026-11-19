import { rapportPourParent } from "@/lib/serveur/rapports-parents";
import { FormulaireQuestionnaire } from "../../composants/formulaire-questionnaire";
import { questionnairePourParent } from "@/lib/serveur/mesures";
import { repondreQuestionnaire } from "./actions";
import { ActionsParent } from "./formulaires";

const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "long" });

function Liste({ titre, elements }: { titre: string; elements: string[] }) {
  if (elements.length === 0) return null;
  return (
    <>
      <h2>{titre}</h2>
      <ul>
        {elements.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </>
  );
}

// Page ouverte depuis le lien d'un rapport reçu (les parents n'ont pas de compte).
export default async function PageRapportParent({ searchParams }: PageProps<"/parent/rapport">) {
  const { jeton } = await searchParams;
  const r = typeof jeton === "string" && jeton !== "" ? await rapportPourParent(jeton) : null;
  if (!r)
    return (
      <main className="conteneur">
        <h1>Lien invalide</h1>
        <p role="status">Ce lien n&apos;est pas valide.</p>
      </main>
    );
  const questionnaire = r.accordActif ? await questionnairePourParent(jeton as string) : null;
  return (
    <main className="conteneur">
      <h1>Rapport sur la progression de {r.prenom}</h1>
      <p className="note">
        Rédigé le {formatDate.format(new Date(r.creeLe))} par son tuteur, une intelligence
        artificielle. Aucune comparaison avec d&apos;autres élèves.
      </p>
      {r.rapport && (
        <>
          <p>{r.rapport.progression}</p>
          <Liste titre="Points forts" elements={r.rapport.points_forts} />
          <Liste titre="Points à renforcer" elements={r.rapport.points_a_renforcer} />
          <Liste titre="Suggestions" elements={r.rapport.suggestions} />
        </>
      )}
      {!r.accordActif && (
        <p role="status">
          Les rapports sont arrêtés. Pour les recevoir à nouveau, votre enfant peut vous les
          proposer depuis son espace.
        </p>
      )}
      <ActionsParent jeton={jeton as string} actif={r.accordActif} />
      {questionnaire && (
        <section>
          <h2>Votre avis (questionnaire anonyme)</h2>
          <p className="note">
            Facultatif. Vos réponses ne sont pas rattachées à votre enfant ni à ce lien ;
            l&apos;équipe ne voit que des totaux.
          </p>
          <FormulaireQuestionnaire
            questionnaire={questionnaire}
            action={repondreQuestionnaire}
            jeton={jeton as string}
            tutoiement={false}
          />
        </section>
      )}
    </main>
  );
}
