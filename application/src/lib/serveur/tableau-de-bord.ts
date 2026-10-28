import "server-only";
import { effectif } from "@/lib/exploitation/indicateurs";
import { etatDuPilote } from "@/lib/pilote/tableau-de-bord";
import type { ChiffresSemaine } from "@/lib/pilote/semaine";
import { avecUtilisateur } from "./base";
import { clotureDuPilote } from "./cloture-pilote";
import { conditionsDuPilote } from "./conditions-pilote";
import { criteresDuPilote } from "./criteres-pilote";
import { periodeDuPilote } from "./fin-pilote";
import { COLONNES_CHIFFRES } from "./semaine-pilote";

// Tableau de bord du pilote (ADR 0088) : lit l'existant (conditions, critères, période, clôture) et, pendant le
// pilote, trois chiffres des 7 derniers jours (agrégés, « <5 » sous 5 élèves).

export async function tableauDeBord(administrateur: string) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const [periode, conditions, { criteres }, gestes] = await Promise.all([
    periodeDuPilote(administrateur),
    conditionsDuPilote(administrateur),
    criteresDuPilote(administrateur),
    clotureDuPilote(administrateur),
  ]);
  const etat = etatDuPilote(periode, conditions, criteres, gestes, aujourdhui);
  if (etat.phase !== "en_cours") return { ...etat, semaine: null };
  const s = await avecUtilisateur(administrateur, async (client) => {
    const { rows } = await client.query(
      `select ${COLONNES_CHIFFRES} from chiffres_periode(current_date - 6, current_date)`,
    );
    return rows[0] as ChiffresSemaine;
  });
  return {
    ...etat,
    semaine: {
      elevesActifs: effectif(s.eleves_actifs),
      quiz: String(s.quiz),
      signalements: String(s.signalements),
    },
  };
}
