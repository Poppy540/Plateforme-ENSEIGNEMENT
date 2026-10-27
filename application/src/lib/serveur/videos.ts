import "server-only";
import { DatabaseError } from "pg";
import type { RapportProduction } from "@/lib/production-video/chaine";
import type { VersionHebergee } from "@/lib/production-video/services";
import { avecUtilisateur } from "./base";
import type { ContexteChapitre } from "./professeur";
import { deciderContenu } from "./validation";

// Revue et publication des vidéos (ADR 0026) : le référent regarde la vidéo « à relire », la valide ou la
// rejette, puis la publie dans un acte distinct. Les élèves ne voient que les vidéos publiées.

const UUID = /^[0-9a-f-]{36}$/;

export interface VideoResume {
  /** Chapitre du pilote : en tête de la file (ADR 0071). */
  pilote: boolean;
  id: string;
  statut: "a_relire" | "validee" | "rejetee" | "publiee";
  chapitreTitre: string;
  unite: string;
  scriptVersion: number;
  creeLe: string;
}

/** Vidéos des familles du référent à relire ou à publier. */
export function videosPourTableau(referent: string): Promise<VideoResume[]> {
  return avecUtilisateur(referent, async (client) => {
    const { rows } = await client.query(
      `select v.id, v.statut, c.titre as "chapitreTitre", u.code as unite, v.script_version as "scriptVersion",
         v.cree_le as "creeLe", est_chapitre_pilote(c.id) as pilote
       from videos v join scripts s on s.id = v.script_id join chapitres c on c.id = s.chapitre_id
       join unites u on u.id = c.unite_id
       where v.statut in ('a_relire', 'validee') order by pilote desc, v.cree_le`,
    );
    return rows as VideoResume[];
  });
}

export interface VideoDetaillee extends VideoResume {
  scriptId: string;
  chapitreId: string;
  reference: string;
  dureeSecondes: number;
  coutUSD: number;
  rapport: RapportProduction;
  historique: {
    objet: "video" | "publication_video";
    decision: "valide" | "rejete";
    commentaire: string | null;
    valideur: string | null;
    decideLe: string;
  }[];
}

export function videoPourReferent(referent: string, id: string): Promise<VideoDetaillee | null> {
  return avecUtilisateur(referent, async (client) => {
    if (!UUID.test(id)) return null;
    const { rows } = await client.query(
      `select v.id, v.statut, c.titre as "chapitreTitre", u.code as unite, v.script_version as "scriptVersion",
         v.cree_le as "creeLe", v.script_id as "scriptId", c.id as "chapitreId",
         v.reference_hebergement as reference, v.duree_secondes as "dureeSecondes",
         v.cout_usd::float as "coutUSD", v.rapport
       from videos v join scripts s on s.id = v.script_id join chapitres c on c.id = s.chapitre_id
       join unites u on u.id = c.unite_id
       where v.id = $1 and est_referent_du_chapitre(c.id)`,
      [id],
    );
    if (!rows[0]) return null;
    const historique = (
      await client.query(
        `select a.objet_type as objet, a.decision, a.commentaire, p.prenom_ou_pseudo as valideur,
           a.decide_le as "decideLe"
         from approbations a left join profils p on p.id = a.valideur_id
         where a.objet_type in ('video', 'publication_video') and a.objet_id = $1 order by a.decide_le`,
        [id],
      )
    ).rows;
    return { ...rows[0], historique } as VideoDetaillee;
  });
}

export function deciderVideo(
  referent: string,
  decision: {
    id: string;
    decision: "valide" | "rejete";
    version: number;
    commentaire: string | null;
  },
) {
  return deciderContenu(referent, "video", decision);
}

export type ResultatPublication = { ok: true } | { ok: false; erreur: string };

/** Publication : acte humain distinct, seulement pour une vidéo validée (vérifié par la base). */
export async function publierVideo(referent: string, id: string): Promise<ResultatPublication> {
  if (!UUID.test(id)) return { ok: false, erreur: "Vidéo inconnue." };
  try {
    await avecUtilisateur(referent, (client) => client.query("select publier_video($1)", [id]));
    return { ok: true };
  } catch (erreur) {
    if (erreur instanceof DatabaseError) {
      if (erreur.code === "42501")
        return { ok: false, erreur: "Vous ne pouvez pas publier cette vidéo." };
      if (erreur.code === "22023") return { ok: false, erreur: erreur.message };
    }
    throw erreur;
  }
}

export interface VideoPubliee {
  id: string;
  reference: string;
  dureeSecondes: number;
  versions: VersionHebergee[];
  aDesSousTitres: boolean;
}

/** Dernière vidéo publiée du chapitre, pour l'élève (sans script ni rapport). */
export function videoDuChapitre(contexte: ContexteChapitre): Promise<VideoPubliee | null> {
  return avecUtilisateur(contexte.eleveId, async (client) => {
    const { rows } = await client.query(
      "select id, reference, duree_secondes, versions, sous_titres from videos_publiees_du_chapitre($1) limit 1",
      [contexte.chapitreId],
    );
    const v = rows[0];
    return v
      ? {
          id: v.id,
          reference: v.reference,
          dureeSecondes: v.duree_secondes,
          versions: v.versions,
          aDesSousTitres: !!v.sous_titres,
        }
      : null;
  });
}

/** Sous-titres WebVTT d'une vidéo que l'utilisateur a le droit de voir (règles d'accès de la base). */
export function sousTitres(utilisateur: string, id: string): Promise<string | null> {
  return avecUtilisateur(utilisateur, async (client) => {
    if (!UUID.test(id)) return null;
    const { rows } = await client.query(
      "select rapport ->> 'sousTitresVtt' as vtt from videos where id = $1",
      [id],
    );
    return (rows[0]?.vtt as string | undefined) ?? null;
  });
}
