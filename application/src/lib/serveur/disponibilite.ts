import "server-only";
import { redirect } from "next/navigation";
import { avecAgentOrchestrateur, avecVisiteur } from "./base";

// Disponibilité (ADR 0034) : un agent suspendu (par l'administration ou l'Orchestrateur) ne répond plus à
// personne, et l'interrupteur d'accès ferme l'espace élève avec un message neutre. Vérifié par le serveur
// avant tout appel à un modèle de langage.

export type AgentSuspendable = "professeur" | "evaluateur" | "scenariste" | "tuteur" | "support";

export const MESSAGE_AGENT_SUSPENDU =
  "Ce service est momentanément indisponible. Merci de réessayer plus tard.";

/** Vrai si l'agent est suspendu (un agent absent de la table est considéré comme actif). */
export async function agentSuspendu(agent: AgentSuspendable): Promise<boolean> {
  return avecAgentOrchestrateur((client) =>
    client
      .query("select suspendu from etat_agents where agent = $1", [agent])
      .then((r) => r.rows[0]?.suspendu === true),
  );
}

/** Interrupteur d'accès des élèves (ouvert par défaut). */
export async function accesElevesOuvert(): Promise<boolean> {
  return avecVisiteur((client) =>
    client.query("select ouvert from acces_eleves").then((r) => r.rows[0]?.ouvert !== false),
  );
}

/** Pages élève : redirection vers la page d'indisponibilité si l'accès est fermé. */
export async function exigerAccesEleves(): Promise<void> {
  if (!(await accesElevesOuvert())) redirect("/indisponible");
}
