"use server";

import type { EtatQuestionnaire } from "../../composants/formulaire-questionnaire";
import { lireReponses } from "@/lib/exploitation/mesures";
import { exigerEleveActif } from "@/lib/serveur/acces-eleve";
import { questionnairePourEleve, repondreQuestionnaireEleve } from "@/lib/serveur/mesures";

export async function repondre(
  _etat: EtatQuestionnaire,
  donnees: FormData,
): Promise<EtatQuestionnaire> {
  const eleve = await exigerEleveActif();
  const questionnaire = await questionnairePourEleve(eleve);
  if (!questionnaire) return { merci: true };
  const reponses = lireReponses(questionnaire.questions, (n) => {
    const v = donnees.get(n);
    return typeof v === "string" ? v : null;
  });
  if (!reponses) return { erreur: "Réponds à chaque question." };
  // Pas de revalidation : la page garde le message de remerciement (/espace est rendu à chaque visite).
  await repondreQuestionnaireEleve(eleve, reponses);
  return { merci: true };
}
