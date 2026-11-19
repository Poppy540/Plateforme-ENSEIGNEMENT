"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { deciderChapitre, deciderLienPrerequis } from "@/lib/serveur/referent";
import { genererBrouillonQuiz } from "@/lib/serveur/evaluateur";
import { genererBrouillonScript } from "@/lib/serveur/scenariste";

export type EtatDecision = { erreur?: string } | undefined;

export async function decider(_etat: EtatDecision, donnees: FormData): Promise<EtatDecision> {
  const utilisateur = await exigerReferent();
  const id = String(donnees.get("id") ?? "");
  const version = Number(donnees.get("version"));
  const choix = String(donnees.get("decision") ?? "");
  const commentaire = String(donnees.get("commentaire") ?? "").trim() || null;

  if (choix !== "valide" && choix !== "rejete")
    return { erreur: "Choisissez de valider ou de rejeter." };
  if (!Number.isInteger(version)) return { erreur: "Version manquante : rechargez la page." };
  if (choix === "rejete" && !commentaire)
    return { erreur: "Expliquez ce qu'il faut corriger en cas de rejet." };
  if (commentaire && commentaire.length > 2000)
    return { erreur: "Commentaire trop long (2000 caractères au plus)." };

  const resultat = await deciderChapitre(utilisateur, {
    id,
    decision: choix,
    version,
    commentaire,
  });
  if (!resultat.ok) return { erreur: resultat.erreur };
  redirect("/referent");
}

export type EtatGeneration = { erreur?: string; succes?: string } | undefined;

export async function genererBrouillon(
  _etat: EtatGeneration,
  donnees: FormData,
): Promise<EtatGeneration> {
  const utilisateur = await exigerReferent();
  const chapitreId = String(donnees.get("chapitre") ?? "");
  const resultat = await genererBrouillonScript(utilisateur, {
    chapitreId,
    dureeMinutes: Number(donnees.get("duree")),
    consigne: String(donnees.get("consigne") ?? "").trim() || null,
  });
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath(`/referent/chapitres/${chapitreId}`);
  const remarques =
    resultat.remarques.length > 0
      ? ` Points de structure à vérifier : ${resultat.remarques.join(" ; ")}.`
      : "";
  return {
    succes: `Brouillon version ${resultat.version} créé${resultat.aRelireEnPriorite ? " — à relire en priorité" : ""}.${remarques}`,
  };
}

export async function genererQuizBrouillon(
  _etat: EtatGeneration,
  donnees: FormData,
): Promise<EtatGeneration> {
  const utilisateur = await exigerReferent();
  const chapitreId = String(donnees.get("chapitre") ?? "");
  const resultat = await genererBrouillonQuiz(utilisateur, {
    chapitreId,
    nombreQuestions: Number(donnees.get("nombre")),
    difficulte: String(donnees.get("difficulte") ?? "") as "variee",
    consigne: String(donnees.get("consigne") ?? "").trim() || null,
  });
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath(`/referent/chapitres/${chapitreId}`);
  return {
    succes: `Quiz version ${resultat.version} créé${resultat.questionsSignalees > 0 ? ` — ${resultat.questionsSignalees} question(s) signalée(s) par l'Évaluateur` : ""}.`,
  };
}

export type EtatLien = { erreur?: string } | undefined;

export async function deciderLien(_etat: EtatLien, donnees: FormData): Promise<EtatLien> {
  const utilisateur = await exigerReferent();
  const chapitreId = String(donnees.get("chapitre") ?? "");
  const choix = String(donnees.get("decision") ?? "");
  if (choix !== "valide" && choix !== "rejete") return { erreur: "Choisissez une décision." };
  const erreur = await deciderLienPrerequis(
    utilisateur,
    { chapitreId, prerequisId: String(donnees.get("prerequis") ?? "") },
    choix,
    String(donnees.get("commentaire") ?? "").trim() || null,
  );
  if (erreur) return { erreur };
  revalidatePath(`/referent/chapitres/${chapitreId}`);
  revalidatePath("/referent");
  return undefined;
}
