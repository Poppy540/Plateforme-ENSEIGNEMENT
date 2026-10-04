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

type RoleAgent = "agent_professeur" | "agent_scenariste";

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
