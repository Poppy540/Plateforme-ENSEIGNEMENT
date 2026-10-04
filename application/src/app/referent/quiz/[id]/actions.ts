"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { deciderQuiz, genererBrouillonQuiz } from "@/lib/serveur/evaluateur";
import { lireDecision } from "../../decision";
import type { EtatFormulaire } from "../../formulaires-contenu";

export async function deciderSurQuiz(
  _etat: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const utilisateur = await exigerReferent();
  const decision = lireDecision(donnees);
  if ("erreur" in decision) return decision;
  const resultat = await deciderQuiz(utilisateur, decision);
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath(`/referent/quiz/${decision.id}`);
  return undefined;
}

export async function demanderRevisionQuiz(
  _etat: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const utilisateur = await exigerReferent();
  const chapitreId = String(donnees.get("chapitre") ?? "");
  const resultat = await genererBrouillonQuiz(utilisateur, {
    chapitreId,
    nombreQuestions: Number(donnees.get("nombre")),
    difficulte: "variee",
    consigne: String(donnees.get("consigne") ?? "").trim() || null,
    revisionDe: String(donnees.get("id") ?? ""),
  });
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath(`/referent/chapitres/${chapitreId}`);
  redirect(`/referent/chapitres/${chapitreId}?quiz=${resultat.version}`);
}
