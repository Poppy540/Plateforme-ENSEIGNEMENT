"use server";

import { utilisateurConnecte } from "@/lib/serveur/session";
import { questionAuSupport } from "@/lib/serveur/support";

export type EtatAide =
  | {
      erreur?: string;
      question?: string;
      reponse?: string;
      ticket?: boolean;
      orientationProfesseur?: boolean;
    }
  | undefined;

export async function poserQuestion(_etat: EtatAide, donnees: FormData): Promise<EtatAide> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) return { erreur: "Connecte-toi pour poser une question." };
  const question = String(donnees.get("question") ?? "");
  const resultat = await questionAuSupport(
    utilisateur,
    question,
    String(donnees.get("referentiel") ?? "") || null,
  );
  if (!resultat.ok) return { erreur: resultat.erreur };
  return {
    question: question.trim(),
    reponse: resultat.reponse,
    ticket: resultat.ticket,
    orientationProfesseur: resultat.orientationProfesseur,
  };
}
