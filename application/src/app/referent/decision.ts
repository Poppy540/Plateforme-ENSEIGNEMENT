// Lecture des champs d'une décision de référent (scripts, quiz), côté serveur.

/** Lecture commune des champs d'une décision ; renvoie une erreur ou la décision prête à transmettre. */
export function lireDecision(
  donnees: FormData,
):
  | { erreur: string }
  | { id: string; version: number; decision: "valide" | "rejete"; commentaire: string | null } {
  const id = String(donnees.get("id") ?? "");
  const version = Number(donnees.get("version"));
  const choix = String(donnees.get("decision") ?? "");
  const commentaire = String(donnees.get("commentaire") ?? "").trim() || null;
  if (choix !== "valide" && choix !== "rejete")
    return { erreur: "Choisissez de valider ou de rejeter." };
  if (!Number.isInteger(version)) return { erreur: "Version manquante : rechargez la page." };
  if (choix === "rejete" && !commentaire)
    return { erreur: "Expliquez ce qu'il faut corriger en cas de rejet." };
  if (choix === "valide" && donnees.get("a_verifier") === "oui" && donnees.get("verifie") !== "oui")
    return {
      erreur:
        "Cochez la case confirmant que vous avez vérifié les points signalés avant de valider.",
    };
  if (commentaire && commentaire.length > 2000)
    return { erreur: "Commentaire trop long (2000 caractères au plus)." };
  return { id, version, decision: choix, commentaire };
}
