import "server-only";
import { Pool, type PoolClient } from "pg";
import { urlBaseDeDonnees } from "./configuration";

// Le serveur se connecte avec le rôle « serveur_application » (aucun droit propre) puis, pour chaque
// requête, prend le rôle « anon » ou « authenticated » avec l'identité de l'utilisateur : les règles
// d'accès de la base s'appliquent exactement comme avec l'API de Supabase (ADR 0014, 0015).

const globalPourPool = globalThis as unknown as { poolBase?: Pool };

function pool(): Pool {
  globalPourPool.poolBase ??= new Pool({ connectionString: urlBaseDeDonnees(), max: 10 });
  return globalPourPool.poolBase;
}

type RoleAgent =
  | "agent_professeur"
  | "agent_scenariste"
  | "agent_evaluateur"
  | "agent_production_video"
  | "agent_orchestrateur"
  | "agent_tuteur"
  | "service_messagerie"
  | "agent_support"
  | "agent_coordinateur"
  | "agent_conformite";

async function enTransaction<T>(
  role: "anon" | "authenticated" | RoleAgent,
  utilisateur: string | null,
  traitement: (client: PoolClient) => Promise<T>,
  contexteAgent: { eleveId: string | null; uniteId: string } | null = null,
): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [utilisateur ?? ""]);
    if (contexteAgent) {
      await client.query(
        "select set_config('app.eleve_id', $1, true), set_config('app.unite_id', $2, true)",
        [contexteAgent.eleveId ?? "", contexteAgent.uniteId],
      );
    }
    const resultat = await traitement(client);
    await client.query("commit");
    return resultat;
  } catch (erreur) {
    await client.query("rollback").catch(() => undefined);
    throw erreur;
  } finally {
    client.release();
  }
}

/** Requêtes au nom d'un utilisateur connecté (règles d'accès « authenticated »). */
export function avecUtilisateur<T>(
  utilisateur: string,
  traitement: (client: PoolClient) => Promise<T>,
) {
  return enTransaction("authenticated", utilisateur, traitement);
}

/** Requêtes au nom d'un visiteur non connecté (règles d'accès « anon »). */
export function avecVisiteur<T>(traitement: (client: PoolClient) => Promise<T>) {
  return enTransaction("anon", null, traitement);
}

/** Requêtes de l'agent Professeur : élève connecté et unité fixés par le serveur, jamais par le modèle. */
export function avecAgentProfesseur<T>(
  contexte: { eleveId: string; uniteId: string },
  traitement: (client: PoolClient) => Promise<T>,
) {
  return enTransaction("agent_professeur", null, traitement, contexte);
}

/** Requêtes de l'agent Scénariste : unité fixée par le serveur ; aucun élève. */
export function avecAgentScenariste<T>(
  uniteId: string,
  traitement: (client: PoolClient) => Promise<T>,
) {
  return enTransaction("agent_scenariste", null, traitement, { eleveId: null, uniteId });
}

/** Requêtes de l'agent Évaluateur : unité et, pendant un quiz, élève connecté, fixés par le serveur. */
export function avecAgentEvaluateur<T>(
  contexte: { eleveId: string | null; uniteId: string },
  traitement: (client: PoolClient) => Promise<T>,
) {
  return enTransaction("agent_evaluateur", null, traitement, contexte);
}

/** Requêtes de la chaîne de production vidéo : aucun élève, aucune unité (elle ne lit que des scripts validés). */
export function avecAgentProductionVideo<T>(traitement: (client: PoolClient) => Promise<T>) {
  return enTransaction("agent_production_video", null, traitement);
}

/** Requêtes de l'Orchestrateur : file de tâches, état des agents, audit, approbations (aucun élève). */
export function avecAgentOrchestrateur<T>(traitement: (client: PoolClient) => Promise<T>) {
  return enTransaction("agent_orchestrateur", null, traitement);
}

/** Requêtes de l'agent Tuteur : élève fixé par le serveur, aucune unité (null = détection planifiée). */
export function avecAgentTuteur<T>(
  eleveId: string | null,
  traitement: (client: PoolClient) => Promise<T>,
) {
  return enTransaction("agent_tuteur", null, traitement, { eleveId, uniteId: "" });
}

/** Service d'envoi des messages : obtient le contact d'un parent seulement pour un envoi autorisé. */
export function avecServiceMessagerie<T>(traitement: (client: PoolClient) => Promise<T>) {
  return enTransaction("service_messagerie", null, traitement);
}

/** Requêtes de l'agent Support : seulement l'utilisateur qui lui écrit (fixé par le serveur). */
export function avecAgentSupport<T>(
  utilisateur: string,
  traitement: (client: PoolClient) => Promise<T>,
) {
  return enTransaction("agent_support", null, traitement, { eleveId: utilisateur, uniteId: "" });
}

/** Réservé à l'authentification simulée (développement et test) : crée le compte d'authentification. */
export async function creerCompteSimule(utilisateur: string): Promise<void> {
  await pool().query("insert into auth.users (id) values ($1) on conflict do nothing", [
    utilisateur,
  ]);
}

/** Réservé à l'authentification simulée (développement et test) : supprime le compte d'authentification. */
export async function supprimerCompteSimule(utilisateur: string): Promise<void> {
  await pool().query("delete from auth.users where id = $1", [utilisateur]);
}

/**
 * Requêtes de l'agent Coordinateur : référentiel et famille fixés par le serveur, jamais par le modèle ;
 * aucun élève dans le contexte.
 */
export function avecAgentCoordinateur<T>(
  contexte: { referentielId: string; famille: string },
  traitement: (client: PoolClient) => Promise<T>,
) {
  return enTransaction("agent_coordinateur", null, async (client) => {
    await client.query(
      `select set_config('app.referentiel_id', $1, true), set_config('app.famille', $2, true),
              set_config('app.eleve_id', '', true), set_config('app.unite_id', '', true)`,
      [contexte.referentielId, contexte.famille],
    );
    return traitement(client);
  });
}

/**
 * Requêtes de l'agent Conformité programme : référentiel, unité comparée et document fixés par le serveur ;
 * aucun élève dans le contexte.
 */
export function avecAgentConformite<T>(
  contexte: { referentielId: string; uniteId: string; documentId: string },
  traitement: (client: PoolClient) => Promise<T>,
) {
  return enTransaction("agent_conformite", null, async (client) => {
    await client.query(
      `select set_config('app.referentiel_id', $1, true), set_config('app.unite_id', $2, true),
              set_config('app.document_id', $3, true), set_config('app.eleve_id', '', true)`,
      [contexte.referentielId, contexte.uniteId, contexte.documentId],
    );
    return traitement(client);
  });
}
