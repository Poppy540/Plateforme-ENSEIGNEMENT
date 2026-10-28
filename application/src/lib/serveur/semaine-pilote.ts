import "server-only";
import { rapportSemaine, type ChiffresSemaine, type Version } from "@/lib/pilote/semaine";
import { avecUtilisateur } from "./base";
import { criteresDuPilote } from "./criteres-pilote";
import { decisionsDuJournal } from "./journal-pilote";

// Rapport hebdomadaire agrégé du pilote (ADR 0082) : chiffres de la base (semaine et précédente), état actuel des
// critères de suspension et décisions de la semaine au journal du pilote (version équipe seulement).

/** Colonnes des chiffres d'une période (semaine_pilote, chiffres_periode), en nombres JavaScript. */
export const COLONNES_CHIFFRES = `to_char(debut, 'YYYY-MM-DD') as debut, to_char(fin, 'YYYY-MM-DD') as fin,
  eleves_inscrits, eleves_actifs, chapitres_termines, videos_demarrees, videos_terminees, lecons_ouvertes,
  questions, quiz, score_moyen::float as score_moyen, contestations, reponses_questionnaire,
  signalements, detresses, hors_programme, contenus_inappropries, erreurs_contenu, demandes_reponses,
  signalements_traites, signalements_ouverts, delai_median_heures::float as delai_median_heures,
  tickets, tickets_resolus, chapitres_valides, cout_usd::float as cout_usd`;

/** Fin de semaine demandée (AAAA-MM-JJ, date réelle, ni future ni avant 2020), sinon aujourd'hui (UTC). */
export function finDeSemaine(demande: unknown): string {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (typeof demande !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(demande)) return aujourdhui;
  const date = new Date(`${demande}T00:00:00Z`);
  const reelle = !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === demande;
  return reelle && demande >= "2020-01-01" && demande <= aujourdhui ? demande : aujourdhui;
}

export function versionDemandee(demande: unknown): Version {
  return demande === "etablissement" ? "etablissement" : "equipe";
}

export async function semaineDuPilote(administrateur: string, fin: string, version: Version) {
  const lignes = await avecUtilisateur(administrateur, async (client) => {
    const { rows } = await client.query(
      `select periode, ${COLONNES_CHIFFRES} from semaine_pilote($1::date)`,
      [fin],
    );
    return rows as (ChiffresSemaine & { periode: string })[];
  });
  const semaine = lignes.find((l) => l.periode === "semaine")!;
  const precedente = lignes.find((l) => l.periode === "precedente")!;
  if (version === "etablissement") return rapportSemaine(version, semaine, precedente);
  const [{ criteres }, dansLaSemaine] = await Promise.all([
    criteresDuPilote(administrateur),
    decisionsDuJournal(administrateur, semaine.debut, semaine.fin),
  ]);
  return rapportSemaine(version, semaine, precedente, criteres, dansLaSemaine);
}
