import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { signerSession, verifierSession, type ContenuSession } from "@/lib/session-signee";
import { avecUtilisateur, avecVisiteur } from "./base";
import { dureeSessionHeures, secretSession, simulationAutorisee } from "./configuration";

// Sessions (revue de sécurité D6, ADR 0049) : cookie signé portant l'identifiant d'une session tenue en base.
// Une session révoquée (déconnexion, « tous mes appareils », incident) ou plus ancienne que la durée de son rôle
// (administration 12 h, référent 7 jours, élève 30 jours par défaut) n'est plus acceptée.

const NOM = "session";
const HEURE_MS = 60 * 60 * 1000;

async function roleDe(utilisateur: string): Promise<string | null> {
  return avecUtilisateur(utilisateur, (client) =>
    client
      .query("select role from profils where id = $1", [utilisateur])
      .then((r) => (r.rows[0]?.role as string | undefined) ?? null),
  );
}

export async function ouvrirSession(utilisateur: string): Promise<void> {
  const heures = dureeSessionHeures(await roleDe(utilisateur));
  const session = await avecUtilisateur(utilisateur, (client) =>
    client.query("select ouvrir_session($1) as id", [heures]).then((r) => r.rows[0].id as string),
  );
  const expire = Date.now() + heures * HEURE_MS;
  (await cookies()).set(NOM, signerSession({ utilisateur, session, expire }, secretSession()), {
    httpOnly: true,
    secure: !simulationAutorisee(),
    sameSite: "lax",
    path: "/",
    expires: new Date(expire),
  });
}

/** Session du cookie si elle est encore active en base (une seule vérification par requête). */
const sessionCourante = cache(async (): Promise<ContenuSession | null> => {
  const contenu = verifierSession((await cookies()).get(NOM)?.value, secretSession());
  if (!contenu || !/^[0-9a-f-]{36}$/.test(contenu.session)) return null;
  const active = await avecVisiteur((client) =>
    client
      .query("select utilisateur, role, cree_le from session_active($1)", [contenu.session])
      .then(
        (r) => r.rows[0] as { utilisateur: string; role: string | null; cree_le: Date } | undefined,
      ),
  );
  if (!active || active.utilisateur !== contenu.utilisateur) return null;
  // Un compte devenu référent ou administrateur garde la durée de son nouveau rôle.
  if (active.cree_le.getTime() + dureeSessionHeures(active.role) * HEURE_MS < Date.now())
    return null;
  return contenu;
});

/** Identifiant de l'utilisateur connecté, ou null. */
export async function utilisateurConnecte(): Promise<string | null> {
  return (await sessionCourante())?.utilisateur ?? null;
}

/** Déconnexion : la session est révoquée en base, puis le cookie effacé. */
export async function fermerSession(): Promise<void> {
  const contenu = verifierSession((await cookies()).get(NOM)?.value, secretSession());
  if (contenu && /^[0-9a-f-]{36}$/.test(contenu.session ?? ""))
    await avecUtilisateur(contenu.utilisateur, (client) =>
      client.query("select revoquer_session($1)", [contenu.session]),
    );
  (await cookies()).delete(NOM);
}

/** « Me déconnecter de tous mes appareils » (cette session comprise). */
export async function fermerToutesMesSessions(utilisateur: string): Promise<void> {
  await avecUtilisateur(utilisateur, (client) => client.query("select revoquer_mes_sessions()"));
  (await cookies()).delete(NOM);
}

/** Incident : l'administration ferme toutes les sessions, sauf la sienne. Rend le nombre de sessions fermées. */
export async function fermerToutesLesSessions(administrateur: string): Promise<number> {
  const garder = (await sessionCourante())?.session ?? null;
  return avecUtilisateur(administrateur, (client) =>
    client
      .query("select revoquer_toutes_les_sessions($1) as n", [garder])
      .then((r) => r.rows[0].n as number),
  );
}
