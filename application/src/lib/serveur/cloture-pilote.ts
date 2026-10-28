import "server-only";
import { DatabaseError } from "pg";
import { masquerCoordonnees } from "@/lib/agents/masquage";
import { evaluerCloture, type CocheGeste, type FaitsCloture } from "@/lib/pilote/cloture";
import { avecUtilisateur } from "./base";
import { empreinteActeur } from "./orchestrateur";

// Clôture du pilote (ADR 0085) : faits de la base, gestes cochés avec preuve, décision finale au journal.
// Rien ici ne supprime de données.

export async function clotureDuPilote(administrateur: string) {
  const { faits, coches } = await avecUtilisateur(administrateur, async (client) => {
    const f = await client.query(
      `select to_char(periode_debut, 'YYYY-MM-DD') as periode_debut,
              to_char(periode_fin, 'YYYY-MM-DD') as periode_fin, rapports_telecharges, decision,
              decision_le::text as decision_le, acces_eleves_ouvert, agents_suspendus
       from faits_cloture()`,
    );
    const c = await client.query(
      `select geste, preuve, to_char(date_preuve, 'YYYY-MM-DD') as date_preuve from gestes_cloture_coches()`,
    );
    return { faits: f.rows[0] as FaitsCloture, coches: c.rows as CocheGeste[] };
  });
  return evaluerCloture(faits, coches, new Date().toISOString().slice(0, 10));
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

export function cocherGeste(administrateur: string, geste: string, preuve: string, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Promise.resolve("Date de la preuve invalide.");
  return appeler(administrateur, "select cocher_geste_cloture($1, $2, $3::date, $4)", [
    geste,
    masquerCoordonnees(preuve.slice(0, 300)),
    date,
    empreinteActeur(administrateur),
  ]);
}

export function decocherGeste(administrateur: string, geste: string, motif: string) {
  return appeler(administrateur, "select decocher_geste_cloture($1, $2, $3)", [
    geste,
    masquerCoordonnees(motif.slice(0, 300)),
    empreinteActeur(administrateur),
  ]);
}

export function noterDecisionFinale(administrateur: string, decision: string, motif: string) {
  return appeler(administrateur, "select noter_decision_finale($1, $2, $3)", [
    decision,
    masquerCoordonnees(motif.slice(0, 400)),
    empreinteActeur(administrateur),
  ]);
}

/** Téléchargement du rapport de fin, noté pour le geste « rapport de fin téléchargé ». */
export async function noterRapportTelecharge(administrateur: string, version: string) {
  await avecUtilisateur(administrateur, (client) =>
    client.query("select noter_rapport_fin_telecharge($1, $2)", [
      version,
      empreinteActeur(administrateur),
    ]),
  );
}
