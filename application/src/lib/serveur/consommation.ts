import "server-only";
import type { Modele } from "@/lib/agents/modele";
import { controlerCout } from "@/lib/orchestrateur/regles";
import { coutUSD } from "@/lib/tests-agents/cout";
import { avecAgentOrchestrateur } from "./base";
import { coutJourMaxUSD } from "./configuration";
import { alerterVeilleSansAttendre } from "./veille";

// Registre des consommations (ADR 0046) : chaque appel au modèle, quel que soit l'agent et qu'il passe ou
// non par la file de l'Orchestrateur, est compté par agent et par jour (jetons, coût estimé), sans aucun
// identifiant d'élève. Au-delà du plafond journalier (COUT_JOUR_MAX_AGENT_USD), l'agent est suspendu et
// l'équipe alertée.

export type AgentFacture =
  | "professeur"
  | "scenariste"
  | "evaluateur"
  | "tuteur"
  | "support"
  | "coordinateur"
  | "conformite"
  | "recruteur";

interface Usage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/** Note un appel et applique le plafond journalier ; une panne du registre ne bloque jamais la réponse. */
export async function noterAppel(agent: AgentFacture, modele: string, usage: Usage | undefined) {
  const u = usage ?? {};
  const cout = coutUSD(modele, u);
  const connu = Number.isFinite(cout);
  const entree =
    (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
  try {
    const total = await avecAgentOrchestrateur((client) =>
      client
        .query("select noter_consommation($1, $2, $3, $4, $5)::float as total", [
          agent,
          entree,
          u.output_tokens ?? 0,
          connu ? cout : 0,
          connu,
        ])
        .then((r) => r.rows[0].total as number),
    );
    const controle = controlerCout(agent, total, coutJourMaxUSD());
    if (!controle.suspendre) return;
    // Une seule suspension et une seule alerte, même si plusieurs appels finissent en même temps.
    const suspendu = await avecAgentOrchestrateur(async (client) => {
      const { rowCount } = await client.query(
        "update etat_agents set suspendu = true, motif = $2 where agent = $1 and not suspendu",
        [agent, controle.alerte],
      );
      if (rowCount)
        await client.query(
          `insert into signalements (source, motif, priorite, resume) values ('agent_orchestrateur', 'autre', 1, $1)`,
          [controle.alerte.slice(0, 2000)],
        );
      return (rowCount ?? 0) > 0;
    });
    if (suspendu) await alerterVeilleSansAttendre();
  } catch (erreur) {
    console.error(`Registre des consommations indisponible (${(erreur as Error).name}).`);
  }
}

/** Modèle dont chaque réponse terminée est notée au registre de l'agent. */
export function avecComptage(modele: Modele, agent: AgentFacture): Modele {
  return (parametres) => {
    const flux = modele(parametres);
    return {
      textes: flux.textes,
      message: flux.message.then(async (message) => {
        await noterAppel(agent, parametres.model, message.usage);
        return message;
      }),
    };
  };
}
