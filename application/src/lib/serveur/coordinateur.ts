import "server-only";
import { DatabaseError } from "pg";
import { dossierPack, racineDepot } from "@/lib/agents/chargeur-prompt";
import type { SortieCoordinateur } from "@/lib/agents/coordinateur/revue";
import { libellesFamilles } from "@/lib/pack-pays/lecture";
import { avecUtilisateur } from "./base";
import { etatTache, soumettre } from "./orchestrateur";

// Coordinateur de famille côté référent (ADR 0038) : demande de revue (par l'Orchestrateur), lecture des
// rapports brouillons, décisions sur chaque proposition. Les droits sont vérifiés par la base.

export interface FamilleDuReferent {
  referentielId: string;
  codePays: string;
  famille: string;
}

export function famillesDuReferent(referent: string): Promise<FamilleDuReferent[]> {
  return avecUtilisateur(referent, async (client) => {
    const { rows } = await client.query(
      `select rf.referentiel_id as "referentielId", r.pays_code as "codePays", rf.famille
       from referents_familles rf join referentiels r on r.id = rf.referentiel_id
       where rf.referent_id = $1 order by rf.famille`,
      [referent],
    );
    return rows as FamilleDuReferent[];
  });
}

export type ResultatLancement =
  { ok: true; message: string; rapportId: string | null } | { ok: false; erreur: string };

/** Demande une revue de cohérence de la famille : la tâche passe par l'Orchestrateur (agent coordinateur). */
export async function lancerRevue(
  referent: string,
  famille: string,
  consigne: string | null,
): Promise<ResultatLancement> {
  if (consigne && consigne.length > 2000)
    return { ok: false, erreur: "Consigne trop longue (2000 caractères)." };
  const f = (await famillesDuReferent(referent)).find((x) => x.famille === famille);
  if (!f) return { ok: false, erreur: "Famille hors de votre périmètre." };
  const soumission = await soumettre(
    { nature: "coherence_famille", famille, details: consigne ?? "" },
    {
      acteur: { role: "referent", id: referent },
      codePays: f.codePays,
      demandeePar: referent,
      entreesServeur: { referentiel_id: f.referentielId, demande_par: referent },
    },
  );
  if (soumission.statut === "refusee") return { ok: false, erreur: soumission.motif };
  if (soumission.statut === "question") return { ok: false, erreur: soumission.question };
  if (soumission.statut !== "en_attente")
    return { ok: false, erreur: `Revue en attente : ${soumission.motif ?? soumission.statut}` };
  const tache = await etatTache(soumission.tacheId);
  if (tache?.statut === "terminee") {
    const r = tache.resultat as { rapportId: string; version: number };
    return {
      ok: true,
      message: `Rapport version ${r.version} prêt (brouillon).`,
      rapportId: r.rapportId,
    };
  }
  if (tache?.statut === "echouee")
    return { ok: false, erreur: `Revue en échec : ${tache.motif ?? "voir l'administration"}` };
  return {
    ok: true,
    message: "Revue demandée : elle sera traitée par la file de tâches.",
    rapportId: null,
  };
}

export interface RapportResume {
  id: string;
  famille: string;
  version: number;
  statut: "brouillon" | "traite";
  creeLe: string;
}

export function rapportsDuReferent(referent: string): Promise<RapportResume[]> {
  return avecUtilisateur(referent, async (client) => {
    const { rows } = await client.query(
      `select id, famille, version, statut, cree_le as "creeLe" from rapports_coordinateur
       order by cree_le desc limit 20`,
    );
    return rows as RapportResume[];
  });
}

export interface RapportDetaille extends RapportResume {
  /** Libellé de la famille dans le pack du pays (le code à défaut). */
  libelleFamille: string;
  contenu: SortieCoordinateur;
  controles: string[];
  decisions: {
    nature: "lien" | "glossaire";
    indice: number;
    decision: "acceptee" | "ecartee";
    commentaire: string | null;
  }[];
}

export function rapportPourReferent(referent: string, id: string): Promise<RapportDetaille | null> {
  return avecUtilisateur(referent, async (client) => {
    if (!/^[0-9a-f-]{36}$/.test(id)) return null;
    const r = (
      await client.query(
        `select id, famille, version, statut, cree_le as "creeLe", contenu, controles,
           (select pays_code from referentiels where id = referentiel_id) as "codePays"
         from rapports_coordinateur where id = $1`,
        [id],
      )
    ).rows[0];
    if (!r) return null;
    const decisions = (
      await client.query(
        "select nature, indice, decision, commentaire from decisions_coordinateur where rapport_id = $1",
        [id],
      )
    ).rows;
    const { codePays, ...rapport } = r;
    const libelleFamille =
      libellesFamilles(dossierPack(racineDepot(), codePays))[r.famille] ?? r.famille;
    return { ...rapport, libelleFamille, decisions } as RapportDetaille;
  });
}

/** Décision du référent sur une proposition ; renvoie un message d'erreur ou null. */
export async function deciderProposition(
  referent: string,
  rapportId: string,
  action: "accepter_lien" | "ecarter_lien" | "ecarter_glossaire" | "adopter_glossaire" | "clore",
  indice: number,
  commentaire: string | null,
): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/.test(rapportId) || !Number.isInteger(indice) || indice < 0)
    return "Proposition inconnue.";
  const requetes = {
    accepter_lien: ["select accepter_lien_coordinateur($1, $2)", [rapportId, indice]],
    ecarter_lien: [
      "select ecarter_proposition_coordinateur($1, 'lien', $2, $3)",
      [rapportId, indice, commentaire],
    ],
    ecarter_glossaire: [
      "select ecarter_proposition_coordinateur($1, 'glossaire', 0, $2)",
      [rapportId, commentaire],
    ],
    adopter_glossaire: ["select adopter_glossaire_coordinateur($1)", [rapportId]],
    clore: ["select clore_rapport_coordinateur($1)", [rapportId]],
  } as const;
  const [sql, valeurs] = requetes[action];
  try {
    await avecUtilisateur(referent, (client) => client.query(sql, [...valeurs]));
    return null;
  } catch (erreur) {
    if (erreur instanceof DatabaseError && (erreur.code === "22023" || erreur.code === "42501"))
      return erreur.message;
    if (erreur instanceof DatabaseError && erreur.code === "23505")
      return "Proposition déjà décidée.";
    throw erreur;
  }
}
