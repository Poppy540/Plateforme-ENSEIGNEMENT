import "server-only";
import { avecAgentOrchestrateur, avecUtilisateur } from "./base";
import { modeFile } from "./configuration";
import { empreinteActeur, executerFile } from "./orchestrateur";

// Suivi de l'Orchestrateur par l'administration (ADR 0029) : état des agents, file humaine, tâches récentes.
// Les règles d'accès de la base réservent ces lectures et la réactivation d'un agent à l'administration.

export interface TableauAdministration {
  accesEleves: { ouvert: boolean; motif: string | null; majLe: string };
  agents: { agent: string; suspendu: boolean; motif: string | null; majLe: string }[];
  fileHumaine: {
    nature: "signalement" | "ticket";
    id: string;
    /** Ticket : ouvert ou en cours. */
    statut: string | null;
    priorite: number;
    source: string;
    motif: string;
    resume: string;
    creeLe: string;
  }[];
  taches: {
    id: string;
    type: string;
    agent: string;
    statut: string;
    priorite: number;
    tentatives: number;
    coutUSD: number;
    motif: string | null;
    creeLe: string;
  }[];
}

export function tableauAdministration(administrateur: string): Promise<TableauAdministration> {
  return avecUtilisateur(administrateur, async (client) => {
    const agents = (
      await client.query(
        `select agent, suspendu, motif, maj_le as "majLe" from etat_agents order by suspendu desc, agent`,
      )
    ).rows;
    // File humaine : priorité (1 = immédiat, détresse), puis ancienneté.
    const fileHumaine = (
      await client.query(
        `select * from (
           select 'signalement' as nature, id, null::text as statut, priorite, source, motif::text as motif, resume,
             cree_le as "creeLe"
           from signalements where traite_le is null
           union all
           select 'ticket', id, statut::text, priorite, 'support', categorie::text, resume, cree_le
           from tickets_support where statut <> 'resolu'
         ) f order by priorite, "creeLe" limit 50`,
      )
    ).rows;
    const taches = (
      await client.query(
        `select id, type, agent, statut, priorite, tentatives, cout_usd::float as "coutUSD", motif, cree_le as "creeLe"
         from taches order by cree_le desc limit 30`,
      )
    ).rows;
    const accesEleves = (
      await client.query(`select ouvert, motif, maj_le as "majLe" from acces_eleves`)
    ).rows[0];
    return { accesEleves, agents, fileHumaine, taches } as TableauAdministration;
  });
}

/** Réactivation d'un agent (administration seulement, vérifié par la base) ; ses tâches suspendues repartent. */
export async function reactiverAgent(administrateur: string, agent: string): Promise<boolean> {
  const fait = await avecUtilisateur(administrateur, async (client) => {
    const { rowCount } = await client.query(
      "update etat_agents set suspendu = false, motif = null where agent = $1 and suspendu",
      [agent],
    );
    if (rowCount)
      await client.query(
        `insert into journal_audit (acteur, acteur_empreinte, action, objet_type, details)
         values ('administrateur', $1, 'reactivation_agent', 'agent', $2)`,
        [empreinteActeur(administrateur), { agent }],
      );
    return (rowCount ?? 0) > 0;
  });
  if (fait) {
    await avecAgentOrchestrateur((client) =>
      client.query(
        "update taches set statut = 'en_attente', motif = null where agent = $1 and statut = 'suspendue'",
        [agent],
      ),
    );
    if (modeFile() === "immediat") await executerFile();
  }
  return fait;
}

/**
 * Traitement d'un élément de la file humaine (ADR 0033) : un signalement est marqué traité ; un ticket est pris
 * en charge puis résolu. La base vérifie le rôle, le traitant et l'absence de réouverture.
 */
export async function traiterFileHumaine(
  administrateur: string,
  nature: string,
  id: string,
  decision: string,
): Promise<boolean> {
  const requetes: Record<string, string> = {
    "signalement:traite":
      "update signalements set traite_le = now(), traite_par = $2 where id = $1 and traite_le is null",
    "ticket:en_cours":
      "update tickets_support set statut = 'en_cours', traite_par = $2 where id = $1 and statut = 'ouvert'",
    "ticket:resolu":
      "update tickets_support set statut = 'resolu', traite_le = now(), traite_par = $2 where id = $1 and statut <> 'resolu'",
  };
  const requete = requetes[`${nature}:${decision}`];
  if (!requete || !/^[0-9a-f-]{36}$/.test(id)) return false;
  return avecUtilisateur(administrateur, async (client) => {
    const { rowCount } = await client.query(requete, [id, administrateur]);
    if (rowCount)
      await client.query(
        `insert into journal_audit (acteur, acteur_empreinte, action, objet_type, objet_id, details)
         values ('administrateur', $1, $2, $3, $4, '{}')`,
        [empreinteActeur(administrateur), `${nature}_${decision}`, nature, id],
      );
    return (rowCount ?? 0) > 0;
  });
}

/** Interrupteur d'accès des élèves (ADR 0034) : administration seulement (vérifié par la base), audité. */
export async function changerAccesEleves(
  administrateur: string,
  ouvert: boolean,
  motif: string | null,
): Promise<boolean> {
  return avecUtilisateur(administrateur, async (client) => {
    const { rowCount } = await client.query(
      `update acces_eleves set ouvert = $1, motif = $2, maj_le = now(), maj_par = $3
       where ouvert is distinct from $1`,
      [ouvert, ouvert ? null : (motif?.slice(0, 500) ?? null), administrateur],
    );
    if (rowCount)
      await client.query(
        `insert into journal_audit (acteur, acteur_empreinte, action, objet_type, details)
         values ('administrateur', $1, $2, 'acces_eleves', '{}')`,
        [
          empreinteActeur(administrateur),
          ouvert ? "ouverture_acces_eleves" : "fermeture_acces_eleves",
        ],
      );
    return (rowCount ?? 0) > 0;
  });
}
