import "server-only";
import { DatabaseError } from "pg";
import { avecUtilisateur } from "./base";

// Décision d'un enseignant-référent sur un contenu versionné (script, quiz, vidéo) : la base vérifie la famille,
// la version relue et qu'aucune décision n'a encore été prise (valider_contenu, ADR 0021).

export type ResultatDecisionContenu = { ok: true } | { ok: false; erreur: string };

export async function deciderContenu(
  referent: string,
  type: "script" | "quiz" | "video",
  decision: {
    id: string;
    decision: "valide" | "rejete";
    version: number;
    commentaire: string | null;
  },
): Promise<ResultatDecisionContenu> {
  if (!/^[0-9a-f-]{36}$/.test(decision.id)) return { ok: false, erreur: "Contenu inconnu." };
  try {
    await avecUtilisateur(referent, (client) =>
      client.query("select valider_contenu($1, $2, $3, $4, $5)", [
        type,
        decision.id,
        decision.decision,
        decision.version,
        decision.commentaire,
      ]),
    );
    return { ok: true };
  } catch (erreur) {
    if (erreur instanceof DatabaseError) {
      if (erreur.code === "40001")
        return {
          ok: false,
          erreur: "Ce n'est pas la version que vous avez lue. Rechargez la page.",
        };
      if (erreur.code === "42501")
        return { ok: false, erreur: "Vous ne pouvez pas valider ce contenu." };
      if (erreur.code === "22023") return { ok: false, erreur: erreur.message };
    }
    throw erreur;
  }
}
