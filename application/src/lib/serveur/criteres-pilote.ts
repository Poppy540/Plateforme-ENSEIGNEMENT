import "server-only";
import { DatabaseError, type PoolClient } from "pg";
import { masquerCoordonnees } from "@/lib/agents/masquage";
import { dossierPack, racineDepot } from "@/lib/agents/chargeur-prompt";
import { lirePack, type SeuilsPilote } from "@/lib/pack-pays/lecture";
import {
  alertesASignaler,
  evaluerCriteres,
  seuilsLesPlusPrudents,
  type Declaration,
  type FaitsCriteres,
} from "@/lib/pilote/criteres";
import { avecAgentOrchestrateur, avecUtilisateur } from "./base";
import { empreinteActeur } from "./orchestrateur";
import { alerterVeilleSansAttendre } from "./veille";

// Critères de suspension du pilote (ADR 0080) : seuils du pack des pays du pilote, faits en base (nombres
// seulement), déclarations du propriétaire. La plateforme signale ; rien ici ne suspend.

const AUCUN_SEUIL: SeuilsPilote = {
  detresse_delai_heures: null,
  detresse_delai_max_heures: null,
  erreur_contenu_delai_jours: null,
  contestations_max_par_question: null,
  depassement_budget_pourcent: null,
  budget_hebdomadaire_usd: null,
};

const seuilsParPays = new Map<string, SeuilsPilote>();
function seuilsDuPays(code: string): SeuilsPilote {
  if (!seuilsParPays.has(code))
    seuilsParPays.set(code, lirePack(dossierPack(racineDepot(), code)).pays.pilote);
  return seuilsParPays.get(code)!;
}

/** Seuils des pays du pilote ; sans chapitre du pilote, aucun critère calculé n'est surveillé. */
function seuilsDesPays(codes: string[]): SeuilsPilote {
  return codes.length ? seuilsLesPlusPrudents(codes.map(seuilsDuPays)) : AUCUN_SEUIL;
}

async function lireFaits(
  client: PoolClient,
  fonction: "faits_criteres_pilote" | "faits_criteres_orchestrateur",
  s: SeuilsPilote,
): Promise<FaitsCriteres> {
  const { rows } = await client.query(`select * from ${fonction}($1, $2, $3)`, [
    s.detresse_delai_heures,
    s.detresse_delai_max_heures,
    s.erreur_contenu_delai_jours,
  ]);
  return { ...rows[0], cout_7_jours: Number(rows[0].cout_7_jours) };
}

export async function criteresDuPilote(administrateur: string) {
  return avecUtilisateur(administrateur, async (client) => {
    const pays = (await client.query("select pays_du_pilote() as code")).rows.map((r) => r.code);
    const seuils = seuilsDesPays(pays);
    const faits = await lireFaits(client, "faits_criteres_pilote", seuils);
    const { rows } = await client.query(
      "select critere, motif, declare_le::text as declare_le from criteres_declares_liste()",
    );
    return {
      pays,
      seuils,
      faits,
      criteres: evaluerCriteres(faits, seuils, rows as Declaration[]),
    };
  });
}

/** Exécuteur planifié : une alerte par épisode dans la file humaine ; la veille est prévenue en priorité 1. */
export async function surveillerCriteres(): Promise<number> {
  const nouvelles = await avecAgentOrchestrateur(async (client) => {
    const pays = (await client.query("select pays_du_pilote_orchestrateur() as code")).rows.map(
      (r) => r.code,
    );
    if (pays.length === 0) return [];
    const seuils = seuilsDesPays(pays);
    const criteres = evaluerCriteres(
      await lireFaits(client, "faits_criteres_orchestrateur", seuils),
      seuils,
      [],
    );
    const { rows } = await client.query("select * from alerter_criteres_pilote($1)", [
      JSON.stringify(alertesASignaler(criteres)),
    ]);
    return rows as { priorite: number; nombre: number }[];
  });
  if (nouvelles.some((n) => n.priorite === 1 && n.nombre > 0)) await alerterVeilleSansAttendre();
  return nouvelles.reduce((total, n) => total + n.nombre, 0);
}

async function appeler(administrateur: string, sql: string, valeurs: unknown[]) {
  try {
    await avecUtilisateur(administrateur, (client) => client.query(sql, valeurs));
    return null;
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "22023") return erreur.message;
    throw erreur;
  }
}

export function declarerCritere(administrateur: string, critere: string, motif: string) {
  return appeler(administrateur, "select declarer_critere($1, $2, $3)", [
    critere,
    masquerCoordonnees(motif.slice(0, 300)),
    empreinteActeur(administrateur),
  ]);
}

export function leverCritere(administrateur: string, critere: string, motif: string) {
  return appeler(administrateur, "select lever_critere($1, $2, $3)", [
    critere,
    masquerCoordonnees(motif.slice(0, 300)),
    empreinteActeur(administrateur),
  ]);
}
