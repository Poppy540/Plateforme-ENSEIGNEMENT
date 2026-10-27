import "server-only";
import { DatabaseError } from "pg";
import { masquerCoordonnees } from "@/lib/agents/masquage";
import {
  evaluerConditions,
  type Coche,
  type ConstatVariable,
  type FaitsPilote,
} from "@/lib/pilote/conditions";
import { verifierConfiguration } from "@/lib/production/verification";
import { avecUtilisateur } from "./base";
import { empreinteActeur } from "./orchestrateur";

// Tableau des 12 conditions du pilote (ADR 0078) : faits en base, configuration du serveur (noms des variables et
// verdicts seulement, jamais une valeur) et coches du propriétaire avec leur preuve.

/** Constats de configuration, sans valeur ; le plafond journalier doit être fixé explicitement (condition 11). */
function constatsConfiguration(env: Record<string, string | undefined>): ConstatVariable[] {
  const plafond = Number(env.COUT_JOUR_MAX_AGENT_USD?.trim() || NaN);
  return [
    ...verifierConfiguration(env).map(({ point, ok }) => ({ point, ok })),
    { point: "COUT_JOUR_MAX_AGENT_USD", ok: Number.isFinite(plafond) && plafond > 0 },
  ];
}

export async function conditionsDuPilote(administrateur: string) {
  const { faits, coches } = await avecUtilisateur(administrateur, async (client) => {
    const f = await client.query("select * from faits_conditions_pilote()");
    const c = await client.query(
      `select numero, preuve, to_char(date_preuve, 'YYYY-MM-DD') as date_preuve
       from conditions_pilote_cochees()`,
    );
    return { faits: f.rows[0] as FaitsPilote, coches: c.rows as Coche[] };
  });
  return evaluerConditions(faits, coches, constatsConfiguration(process.env));
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

/** Coche une condition ; la preuve est débarrassée des emails et numéros de téléphone. */
export function cocherCondition(
  administrateur: string,
  numero: number,
  preuve: string,
  date: string,
): Promise<string | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Promise.resolve("Date de la preuve invalide.");
  return appeler(administrateur, "select cocher_condition_pilote($1, $2, $3::date, $4)", [
    numero,
    masquerCoordonnees(preuve.slice(0, 300)),
    date,
    empreinteActeur(administrateur),
  ]);
}

export function decocherCondition(
  administrateur: string,
  numero: number,
  motif: string,
): Promise<string | null> {
  return appeler(administrateur, "select decocher_condition_pilote($1, $2, $3)", [
    numero,
    masquerCoordonnees(motif.slice(0, 300)),
    empreinteActeur(administrateur),
  ]);
}
