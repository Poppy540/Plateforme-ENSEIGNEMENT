import "server-only";
import { Pool, type PoolClient } from "pg";
import { selOpposition, urlBaseDeDonnees } from "./configuration";

// Le serveur se connecte avec le rôle « serveur_application » (aucun droit propre) puis, pour chaque
// requête, prend le rôle « anon » ou « authenticated » avec l'identité de l'utilisateur : les règles
// d'accès de la base s'appliquent exactement comme avec l'API de Supabase (ADR 0014, 0015).

const globalPourPool = globalThis as unknown as { poolBase?: Pool };

/** Connexions ouvertes au plus par instance du serveur (ADR 0059) ; à garder sous la limite de la base. */
function taillePool(): number {
  const n = Number(process.env.TAILLE_POOL_BASE);
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : 10;
}

function pool(): Pool {
  globalPourPool.poolBase ??= new Pool({
    connectionString: urlBaseDeDonnees(),
    max: taillePool(),
    // Une requête n'attend pas indéfiniment une connexion libre : erreur franche plutôt qu'une page figée.
    connectionTimeoutMillis: 10_000,
  });
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
  | "agent_conformite"
  | "agent_recruteur";

const ROLES_OPPOSITION = new Set(["authenticated", "agent_recruteur", "service_messagerie"]);

async function enTransaction<T>(
  role: "anon" | "authenticated" | RoleAgent,
  utilisateur: string | null,
  traitement: (client: PoolClient) => Promise<T>,
  contexteAgent: { eleveId: string | null; uniteId: string } | null = null,
): Promise<T> {
  const client = await pool().connect();
  try {
    // Ouverture en un seul aller-retour (ADR 0064) : début de transaction, rôle, identité et contexte, au lieu de
    // quatre. Requête simple sans paramètres : chaque valeur passe par escapeLiteral ; le rôle vient d'une liste
    // fermée (type ci-dessus), jamais d'une saisie.
    if (!/^[a-z_]+$/.test(role)) throw new Error("Rôle de base de données invalide.");
    const valeur = (v: string) => client.escapeLiteral(v);
    // Sel de la liste d'opposition (revue de sécurité D4) : pour la transaction seulement, et seulement pour les
    // rôles qui créent ou suppriment une fiche de candidat, enregistrent une opposition ou envoient un message.
    const reglages = [
      ["request.jwt.claim.sub", utilisateur ?? ""],
      ["app.sel_opposition", ROLES_OPPOSITION.has(role) ? selOpposition() : ""],
      ...(contexteAgent
        ? [
            ["app.eleve_id", contexteAgent.eleveId ?? ""],
            ["app.unite_id", contexteAgent.uniteId],
          ]
        : []),
    ];
    await client.query(
      `begin; set local role ${role}; select ${reglages
        .map(([nom, v]) => `set_config(${valeur(nom)}, ${valeur(v)}, true)`)
        .join(", ")}`,
    );
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

/** Requêtes de l'agent Recruteur : un seul candidat, fixé par le serveur ; aucun élève dans le contexte. */
export function avecAgentRecruteur<T>(
  contexte: { candidatId: string },
  traitement: (client: PoolClient) => Promise<T>,
) {
  return enTransaction("agent_recruteur", null, async (client) => {
    await client.query(
      "select set_config('app.candidat_id', $1, true), set_config('app.eleve_id', '', true)",
      [contexte.candidatId],
    );
    return traitement(client);
  });
}

/** Place du quota du jour de l'élève connecté, prise avant l'appel au modèle et gardée s'il échoue. */
export function prendreQuotaEleve(
  eleve: string,
  nature: "plan_tuteur" | "correction_quiz" | "contestation_quiz",
  max: number,
): Promise<boolean> {
  return avecUtilisateur(eleve, (client) =>
    client
      .query("select prendre_quota_eleve($1, $2) as ok", [nature, max])
      .then((r) => r.rows[0].ok === true),
  );
}
