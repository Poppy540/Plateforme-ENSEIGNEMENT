"use server";

import { revalidatePath } from "next/cache";
import { exigerEleveActif } from "@/lib/serveur/acces-eleve";
import { contesterCorrection, quizPourEleve, soumettreQuiz } from "@/lib/serveur/evaluateur";
import { contexteChapitre } from "@/lib/serveur/professeur";

export type EtatQuiz = { erreur?: string; succes?: string } | undefined;

async function contexte(donnees: FormData) {
  const utilisateur = await exigerEleveActif();
  const unite = String(donnees.get("unite") ?? "");
  const chapitre = String(donnees.get("chapitre") ?? "");
  return {
    chemin: `/catalogue/${unite}/${chapitre}/quiz`,
    contexte: await contexteChapitre(utilisateur, unite, chapitre),
  };
}

export async function envoyerReponses(_etat: EtatQuiz, donnees: FormData): Promise<EtatQuiz> {
  const { chemin, contexte: c } = await contexte(donnees);
  if (!c) return { erreur: "Chapitre inconnu." };
  const quiz = await quizPourEleve(c);
  const quizId = String(donnees.get("quiz") ?? "");
  if (!quiz || quiz.quizId !== quizId) return { erreur: "Ce quiz a changé : recharge la page." };
  const reponses = quiz.questions.map((q, i) => {
    const valeur = donnees.get(`reponse-${i}`);
    if (valeur === null || valeur === "") return null;
    return q.type === "reponse_courte" ? String(valeur) : Number(valeur);
  });
  const resultat = await soumettreQuiz(c, quizId, reponses);
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath(chemin);
  return undefined;
}

export async function contester(_etat: EtatQuiz, donnees: FormData): Promise<EtatQuiz> {
  const { chemin, contexte: c } = await contexte(donnees);
  if (!c) return { erreur: "Chapitre inconnu." };
  const resultat = await contesterCorrection(
    c,
    String(donnees.get("quiz") ?? ""),
    Number(donnees.get("question")),
    String(donnees.get("message") ?? ""),
  );
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath(chemin);
  return {
    succes: resultat.transmise
      ? "Ta contestation a été transmise à un enseignant, qui la regardera."
      : "Ta réponse a été réexaminée (voir ci-dessus).",
  };
}
