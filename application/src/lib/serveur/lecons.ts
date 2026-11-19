import "server-only";
import { lireLecon, type LeconEcrite } from "@/lib/lecon";
import { avecUtilisateur } from "./base";
import type { ContexteChapitre } from "./professeur";

/** Leçon écrite du chapitre (script validé et inchangé, vérifié par la base), ou null. */
export function leconDuChapitre(contexte: ContexteChapitre): Promise<LeconEcrite | null> {
  return avecUtilisateur(contexte.eleveId, async (client) => {
    const { rows } = await client.query("select lecon_du_chapitre($1) as lecon", [
      contexte.chapitreId,
    ]);
    return lireLecon(rows[0]?.lecon);
  });
}
