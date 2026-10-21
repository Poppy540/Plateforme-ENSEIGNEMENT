"use server";

import { revalidatePath } from "next/cache";
import type { EtatQuestionnaire } from "../../composants/formulaire-questionnaire";
import { lireReponses } from "@/lib/exploitation/mesures";
import { questionnairePourParent, repondreQuestionnaireParent } from "@/lib/serveur/mesures";
import { adresseDuSite } from "@/lib/serveur/origine";
import {
  arreterRapports,
  demanderRapportMaintenant,
  questionDuParent,
} from "@/lib/serveur/rapports-parents";

export type EtatParent = { erreur?: string; succes?: string; reponse?: string } | undefined;

export async function demanderMaintenant(
  _etat: EtatParent,
  donnees: FormData,
): Promise<EtatParent> {
  const r = await demanderRapportMaintenant(
    String(donnees.get("jeton") ?? ""),
    await adresseDuSite(),
  );
  return r.ok ? { succes: "Un nouveau rapport vous a été envoyé." } : { erreur: r.erreur };
}

export async function arreter(_etat: EtatParent, donnees: FormData): Promise<EtatParent> {
  const ok = await arreterRapports(String(donnees.get("jeton") ?? ""));
  revalidatePath("/parent/rapport");
  return ok
    ? { succes: "Vous ne recevrez plus de rapports." }
    : { erreur: "Les rapports étaient déjà arrêtés." };
}

export async function poserQuestion(_etat: EtatParent, donnees: FormData): Promise<EtatParent> {
  const r = await questionDuParent(
    String(donnees.get("jeton") ?? ""),
    String(donnees.get("question") ?? ""),
  );
  return r.ok ? { reponse: r.reponse.reponse } : { erreur: r.erreur };
}

/** Questionnaire anonyme du parent (ADR 0052) : une fois par accord ; rien ne relie la réponse au rapport. */
export async function repondreQuestionnaire(
  _etat: EtatQuestionnaire,
  donnees: FormData,
): Promise<EtatQuestionnaire> {
  const jeton = String(donnees.get("jeton") ?? "");
  const questionnaire = await questionnairePourParent(jeton);
  if (!questionnaire) return { merci: true };
  const reponses = lireReponses(questionnaire.questions, (n) => {
    const v = donnees.get(n);
    return typeof v === "string" ? v : null;
  });
  if (!reponses) return { erreur: "Merci de répondre à chaque question." };
  await repondreQuestionnaireParent(jeton, reponses);
  return { merci: true };
}
