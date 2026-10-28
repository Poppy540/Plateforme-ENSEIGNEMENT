import "server-only";
import { DatabaseError } from "pg";
import {
  decouperEnSemaines,
  rapportFin,
  type AlerteCritere,
  type Intervalle,
} from "@/lib/pilote/fin";
import type { ChiffresSemaine, Version } from "@/lib/pilote/semaine";
import { avecUtilisateur } from "./base";
import { decisionsDuJournal } from "./journal-pilote";
import { resultatsQuestionnaires } from "./mesures";
import { empreinteActeur } from "./orchestrateur";
import { COLONNES_CHIFFRES } from "./semaine-pilote";

// Période du pilote et rapport de fin (ADR 0084) : chiffres de la base sur toute la période et semaine par
// semaine, questionnaire anonyme, alertes de critères et décisions du journal (version équipe).

export interface PeriodePilote {
  debut: string;
  fin: string | null;
}

export function periodeDuPilote(administrateur: string): Promise<PeriodePilote | null> {
  return avecUtilisateur(administrateur, async (client) => {
    const { rows } = await client.query(
      `select to_char(debut, 'YYYY-MM-DD') as debut, to_char(fin, 'YYYY-MM-DD') as fin
       from periode_pilote_lire()`,
    );
    return rows[0] ?? null;
  });
}

const dateValide = (d: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);

export async function definirPeriode(
  administrateur: string,
  debut: string,
  fin: string,
): Promise<string | null> {
  if (!dateValide(debut) || (fin !== "" && !dateValide(fin))) return "Date invalide.";
  try {
    await avecUtilisateur(administrateur, (client) =>
      client.query("select definir_periode_pilote($1::date, $2::date, $3)", [
        debut,
        fin || null,
        empreinteActeur(administrateur),
      ]),
    );
    return null;
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "22023") return erreur.message;
    throw erreur;
  }
}

/** Rapport de fin sur la période saisie ; un pilote en cours s'arrête à aujourd'hui (UTC). */
export async function rapportDeFin(
  administrateur: string,
  periode: PeriodePilote,
  version: Version,
) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const fin = periode.fin && periode.fin < aujourdhui ? periode.fin : aujourdhui;
  const intervalle: Intervalle = {
    debut: periode.debut,
    fin: fin < periode.debut ? periode.debut : fin,
  };
  // Une seule transaction, requêtes l'une après l'autre (jusqu'à 53 semaines) : le réservoir de connexions reste libre.
  const [total, ...semaines] = await avecUtilisateur(administrateur, async (client) => {
    const resultats: ChiffresSemaine[] = [];
    for (const i of [intervalle, ...decouperEnSemaines(intervalle.debut, intervalle.fin)]) {
      const { rows } = await client.query(
        `select ${COLONNES_CHIFFRES} from chiffres_periode($1::date, $2::date)`,
        [i.debut, i.fin],
      );
      resultats.push(rows[0] as ChiffresSemaine);
    }
    return resultats;
  });
  const enCours = periode.fin === null || periode.fin > aujourdhui;
  const questionnaire = await resultatsQuestionnaires(administrateur);
  if (version === "etablissement")
    return rapportFin(version, { ...intervalle, enCours }, total, semaines, questionnaire);
  const [alertes, journal] = await Promise.all([
    avecUtilisateur(administrateur, async (client) => {
      const { rows } = await client.query(
        `select cree_le::text as cree_le, priorite, resume from alertes_criteres_periode($1::date, $2::date)`,
        [intervalle.debut, intervalle.fin],
      );
      return rows.map((r) => ({
        ...r,
        cree_le: new Date(r.cree_le).toISOString(),
      })) as AlerteCritere[];
    }),
    decisionsDuJournal(administrateur, intervalle.debut, intervalle.fin),
  ]);
  return rapportFin(
    version,
    { ...intervalle, enCours },
    total,
    semaines,
    questionnaire,
    alertes,
    journal,
  );
}
