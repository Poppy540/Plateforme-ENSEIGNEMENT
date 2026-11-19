import "server-only";
import { simulerSortDesDonnees, type LigneSimulation } from "@/lib/pilote/donnees";
import { avecUtilisateur } from "./base";

// Sort des données en fin de pilote (ADR 0086) : SIMULATION par pays du pilote, en nombres ; l'avis du juriste
// (condition 1 du pilote, ADR 0078) est rappelé. Rien n'est effacé ici.

export async function sortDesDonnees(administrateur: string) {
  return avecUtilisateur(administrateur, async (client) => {
    const pays = (await client.query("select pays_du_pilote() as code")).rows.map((r) => r.code);
    const periode = (
      await client.query("select to_char(fin, 'YYYY-MM-DD') as fin from periode_pilote_lire()")
    ).rows[0] as { fin: string | null } | undefined;
    const avisJuriste =
      (await client.query("select 1 from conditions_pilote_cochees() where numero = 1")).rowCount! >
      0;
    const simulations = [];
    for (const code of pays) {
      const { rows } = await client.query(
        "select categorie, duree_jours, total, a_effacer from simulation_sort_donnees($1)",
        [code],
      );
      simulations.push({
        pays: code,
        categories: simulerSortDesDonnees(rows as LigneSimulation[], periode?.fin ?? null),
      });
    }
    return { finPilote: periode?.fin ?? null, avisJuriste, simulations };
  });
}
