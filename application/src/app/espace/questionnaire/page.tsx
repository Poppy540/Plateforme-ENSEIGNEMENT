import Link from "next/link";
import { FormulaireQuestionnaire } from "../../composants/formulaire-questionnaire";
import { exigerEleveActif } from "@/lib/serveur/acces-eleve";
import { questionnairePourEleve } from "@/lib/serveur/mesures";
import { repondre } from "./actions";

// Questionnaire anonyme du pilote (ADR 0052), proposé une fois par version.
export default async function PageQuestionnaire() {
  const eleve = await exigerEleveActif();
  const questionnaire = await questionnairePourEleve(eleve);
  return (
    <main className="conteneur">
      <p>
        <Link href="/espace">← Mon espace</Link>
      </p>
      <h1>Ton avis sur la plateforme</h1>
      <p className="note">
        Questionnaire anonyme : tes réponses ne sont pas rattachées à ton compte, et l&apos;équipe
        ne voit que des totaux. Tu peux ne pas répondre.
      </p>
      {questionnaire ? (
        <FormulaireQuestionnaire questionnaire={questionnaire} action={repondre} tutoiement />
      ) : (
        <p role="status">Aucun questionnaire en ce moment. Merci !</p>
      )}
    </main>
  );
}
