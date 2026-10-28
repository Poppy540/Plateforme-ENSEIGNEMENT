import "server-only";
import { DatabaseError } from "pg";
import { masquerCoordonnees } from "@/lib/agents/masquage";
import type { EntreeJournalSemaine } from "@/lib/pilote/semaine";
import { avecAgentOrchestrateur, avecUtilisateur } from "./base";
import { modeFile } from "./configuration";
import { empreinteActeur, executerFile } from "./orchestrateur";

// Journal du pilote (ADR 0081) : suspensions, reprises (avec les 4 points de criteres-arret.md), points
// hebdomadaires et notes. Les contrôles sont faits par la base ; les textes perdent leurs coordonnées avant.

export interface EntreeJournal {
  id: string;
  type:
    | "suspension_agent"
    | "reprise_agent"
    | "fermeture_acces"
    | "reprise_acces"
    | "point_hebdomadaire"
    | "note";
  agent: string | null;
  critere: string | null;
  texte: string;
  cause: string | null;
  correction: string | null;
  cree_le: Date;
}

export interface Reprise {
  cause: string;
  correction: string;
  accord: boolean;
  etablissement: boolean;
}

const nettoyer = (texte: string, max: number) => masquerCoordonnees(texte.slice(0, max));
const critereOuNul = (critere: string) => (/^[a-z_]{3,40}$/.test(critere) ? critere : null);

async function appeler(administrateur: string, sql: string, valeurs: unknown[]) {
  try {
    await avecUtilisateur(administrateur, (client) => client.query(sql, valeurs));
    return null;
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "22023") return erreur.message;
    throw erreur;
  }
}

export function suspendreAgent(
  administrateur: string,
  agent: string,
  motif: string,
  critere: string,
) {
  return appeler(administrateur, "select suspendre_agent_pilote($1, $2, $3, $4)", [
    agent,
    nettoyer(motif, 500),
    critereOuNul(critere),
    empreinteActeur(administrateur),
  ]);
}

/** Reprise d'un agent ; ses tâches suspendues repartent dans la file. */
export async function reprendreAgent(administrateur: string, agent: string, r: Reprise) {
  const erreur = await appeler(
    administrateur,
    "select reprendre_agent_pilote($1, $2, $3, $4, $5, $6)",
    [
      agent,
      nettoyer(r.cause, 300),
      nettoyer(r.correction, 300),
      r.accord,
      r.etablissement,
      empreinteActeur(administrateur),
    ],
  );
  if (erreur) return erreur;
  await avecAgentOrchestrateur((client) =>
    client.query(
      "update taches set statut = 'en_attente', motif = null where agent = $1 and statut = 'suspendue'",
      [agent],
    ),
  );
  if (modeFile() === "immediat") await executerFile();
  return null;
}

export function fermerAcces(administrateur: string, motif: string, critere: string) {
  return appeler(administrateur, "select fermer_acces_pilote($1, $2, $3)", [
    nettoyer(motif, 500),
    critereOuNul(critere),
    empreinteActeur(administrateur),
  ]);
}

export function rouvrirAcces(administrateur: string, r: Reprise) {
  return appeler(administrateur, "select rouvrir_acces_pilote($1, $2, $3, $4, $5)", [
    nettoyer(r.cause, 300),
    nettoyer(r.correction, 300),
    r.accord,
    r.etablissement,
    empreinteActeur(administrateur),
  ]);
}

export function noterJournal(administrateur: string, type: string, texte: string, critere: string) {
  return appeler(administrateur, "select noter_journal_pilote($1, $2, $3, $4)", [
    type,
    nettoyer(texte, 500),
    critereOuNul(critere),
    empreinteActeur(administrateur),
  ]);
}

export function journalDuPilote(administrateur: string, limite = 100): Promise<EntreeJournal[]> {
  return avecUtilisateur(administrateur, async (client) => {
    const { rows } = await client.query("select * from journal_pilote_liste($1)", [limite]);
    return rows;
  });
}

/**
 * Décisions notées entre deux jours (inclus), des plus anciennes aux plus récentes, pour les rapports (ADR 0082,
 * 0084). Une reprise se résume par sa cause et sa correction (les 4 points sont exigés par la base).
 */
export async function decisionsDuJournal(
  administrateur: string,
  debut: string,
  fin: string,
): Promise<EntreeJournalSemaine[]> {
  return (await journalDuPilote(administrateur, 500))
    .map((e) => ({
      type: e.type,
      agent: e.agent,
      texte: e.cause ? `cause : ${e.cause} ; correction : ${e.correction}` : e.texte,
      cree_le: new Date(e.cree_le).toISOString(),
    }))
    .filter((e) => e.cree_le.slice(0, 10) >= debut && e.cree_le.slice(0, 10) <= fin)
    .reverse();
}
