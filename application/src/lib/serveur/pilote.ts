import "server-only";
import { DatabaseError } from "pg";
import { prochaineAction, type EtatChapitrePilote } from "@/lib/referent/prochaine-action";
import { avecUtilisateur } from "./base";
import { empreinteActeur } from "./orchestrateur";

// Chapitres du pilote et accueil du référent (ADR 0070). Les chapitres sont choisis par l'administration en base ;
// la prochaine action est déduite de l'état des contenus (fonction pure).

export async function chapitresPiloteDuReferent(referent: string) {
  const etats = await avecUtilisateur(referent, async (client) => {
    const { rows } = await client.query(
      `select chapitre_id, unite, titre, statut_chapitre, liens_a_decider, script_id, statut_script,
              quiz_id, statut_quiz, video_id, statut_video
       from etat_chapitres_pilote()`,
    );
    return rows as EtatChapitrePilote[];
  });
  return etats.map((e) => ({ ...e, action: prochaineAction(e) }));
}

export function accueilVu(referent: string): Promise<boolean> {
  return avecUtilisateur(referent, async (client) => {
    const { rows } = await client.query("select accueil_vu_le from profils where id = $1", [
      referent,
    ]);
    return rows[0]?.accueil_vu_le != null;
  });
}

export async function marquerAccueilVu(referent: string): Promise<void> {
  await avecUtilisateur(referent, (client) => client.query("select marquer_accueil_vu()"));
}

export interface UnitePilote {
  unite: string;
  niveau: string;
  matiere: string;
  pilote: number;
}

export function unitesPourPilote(administrateur: string): Promise<UnitePilote[]> {
  return avecUtilisateur(administrateur, async (client) => {
    const { rows } = await client.query("select * from unites_pour_pilote()");
    return rows;
  });
}

export function chapitresUnitePilote(
  administrateur: string,
  unite: string,
): Promise<{ code: string; titre: string; pilote: boolean }[]> {
  return avecUtilisateur(administrateur, async (client) => {
    const { rows } = await client.query(
      "select code, titre, pilote from chapitres_unite_pilote($1)",
      [unite],
    );
    return rows;
  });
}

export async function definirChapitresPilote(
  administrateur: string,
  unite: string,
  chapitres: string[],
): Promise<string | null> {
  try {
    await avecUtilisateur(administrateur, (client) =>
      client.query("select definir_chapitres_pilote($1, $2, $3)", [
        unite,
        chapitres,
        empreinteActeur(administrateur),
      ]),
    );
    return null;
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "22023") return erreur.message;
    throw erreur;
  }
}
