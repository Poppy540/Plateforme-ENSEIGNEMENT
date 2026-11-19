import "server-only";
import { DatabaseError } from "pg";
import { dossierPack, racineDepot } from "@/lib/agents/chargeur-prompt";
import {
  lireRecrutement,
  type ConfigurationRecrutement,
} from "@/lib/agents/recruteur/configuration";
import { libellesFamilles } from "@/lib/pack-pays/lecture";
import { avecServiceMessagerie, avecUtilisateur } from "./base";
import { envoyerMessage } from "./messagerie";

// Recrutement côté propriétaire (ADR 0010, 0040) : fiches minimales, approbation des brouillons (empreinte du
// texte lu), envoi par le service de messagerie (simulé), accord signé hors plateforme, suppression. Les droits
// et les règles (opposition, une relance, délai) sont vérifiés par la base.

export interface ReferentielRecrutement {
  id: string;
  code: string;
  paysCode: string;
  configuration: ConfigurationRecrutement | null;
  familles: Record<string, string>;
}

export interface LigneCandidat {
  id: string;
  referentielId: string;
  nom: string;
  famille: string;
  source: string;
  statut: string;
  adequation: string | null;
  enAttente: number;
  majLe: string;
}

/** Référentiels dont le pack prévoit un recrutement, avec ses sources et ses familles. */
export function referentielsRecrutement(administrateur: string): Promise<ReferentielRecrutement[]> {
  return avecUtilisateur(administrateur, async (client) => {
    const rows = (
      await client.query(
        `select id, code, pays_code as "paysCode" from referentiels order by pays_code, code`,
      )
    ).rows as { id: string; code: string; paysCode: string }[];
    return rows.map((r) => {
      const pack = dossierPack(racineDepot(), r.paysCode);
      return { ...r, configuration: lireRecrutement(pack), familles: libellesFamilles(pack) };
    });
  });
}

export function listeCandidats(administrateur: string): Promise<LigneCandidat[]> {
  return avecUtilisateur(administrateur, (client) =>
    client
      .query(
        `select c.id, c.referentiel_id as "referentielId", c.nom, c.famille, c.source, c.statut, c.adequation, c.maj_le as "majLe",
           (select count(*)::int from messages_recrutement m where m.candidat_id = c.id and m.statut = 'brouillon')
             as "enAttente"
         from candidats c order by c.maj_le desc limit 200`,
      )
      .then((r) => r.rows as LigneCandidat[]),
  );
}

const CONTACT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Nouvelle fiche minimale : source autorisée du pack, famille du pack, contact professionnel (email). */
export async function creerCandidat(
  administrateur: string,
  f: {
    referentiel: string;
    nom: string;
    famille: string;
    niveau: string;
    structure: string;
    contact: string;
    source: string;
    sourceDetail: string;
  },
): Promise<{ ok: true; id: string } | { ok: false; erreur: string }> {
  const referentiels = await referentielsRecrutement(administrateur);
  const r = referentiels.find((x) => x.id === f.referentiel);
  if (!r?.configuration)
    return { ok: false, erreur: "Recrutement non configuré pour ce référentiel." };
  if (!r.configuration.sources.some((s) => s.id === f.source))
    return { ok: false, erreur: "Source non autorisée." };
  if (!r.familles[f.famille]) return { ok: false, erreur: "Famille inconnue." };
  if (!f.nom.trim() || f.nom.length > 120) return { ok: false, erreur: "Nom invalide." };
  if (!CONTACT.test(f.contact.trim()))
    return { ok: false, erreur: "Contact invalide : une adresse email professionnelle." };
  try {
    const id = await avecUtilisateur(administrateur, (client) =>
      client
        .query(
          `insert into candidats (referentiel_id, nom, famille, niveau, structure, contact, source, source_detail, cree_par)
           values ($1, $2, $3, nullif($4, ''), nullif($5, ''), $6, $7, nullif($8, ''), $9) returning id`,
          [
            r.id,
            f.nom.trim(),
            f.famille,
            f.niveau.trim().slice(0, 60),
            f.structure.trim().slice(0, 200),
            f.contact.trim(),
            f.source,
            f.sourceDetail.trim().slice(0, 300),
            administrateur,
          ],
        )
        .then((x) => x.rows[0].id as string),
    );
    return { ok: true, id };
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "23514")
      return { ok: false, erreur: "Cette personne a demandé à ne plus être contactée." };
    throw erreur;
  }
}

export interface FicheCandidat {
  id: string;
  referentielId: string;
  nom: string;
  famille: string;
  niveau: string | null;
  structure: string | null;
  contact: string;
  source: string;
  sourceDetail: string | null;
  adequation: string | null;
  justification: string | null;
  pointsAVerifier: string[];
  secteurPublicAVerifier: boolean;
  statut: string;
  messages: {
    id: string;
    nature: string;
    objet: string;
    texte: string;
    empreinte: string;
    statut: string;
    approuveLe: string | null;
    envoyeLe: string | null;
    creeLe: string;
  }[];
  dossiers: {
    id: string;
    resume: string;
    consentementSepare: boolean;
    pointsAValider: string[];
    creeLe: string;
  }[];
}

export function ficheCandidat(administrateur: string, id: string): Promise<FicheCandidat | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return Promise.resolve(null);
  return avecUtilisateur(administrateur, async (client) => {
    const c = (
      await client.query(
        `select id, referentiel_id as "referentielId", nom, famille, niveau, structure, contact, source,
           source_detail as "sourceDetail", adequation, justification, points_a_verifier as "pointsAVerifier",
           secteur_public_a_verifier as "secteurPublicAVerifier", statut
         from candidats where id = $1`,
        [id],
      )
    ).rows[0];
    if (!c) return null;
    const messages = (
      await client.query(
        `select id, nature, objet, texte, empreinte, statut, approuve_le as "approuveLe", envoye_le as "envoyeLe",
           cree_le as "creeLe"
         from messages_recrutement where candidat_id = $1 order by cree_le desc`,
        [id],
      )
    ).rows;
    const dossiers = (
      await client.query(
        `select id, resume, consentement_image_voix_separe as "consentementSepare",
           points_a_valider as "pointsAValider", cree_le as "creeLe"
         from dossiers_accord where candidat_id = $1 order by cree_le desc`,
        [id],
      )
    ).rows;
    return { ...c, messages, dossiers } as FicheCandidat;
  });
}

/** Approbation du texte LU par le propriétaire : l'empreinte affichée doit être celle du brouillon. */
export function approuverMessage(administrateur: string, message: string, empreinte: string) {
  return avecUtilisateur(administrateur, (client) =>
    client
      .query("select approuver_message_recrutement($1, $2) as ok", [message, empreinte])
      .then((r) => r.rows[0].ok === true),
  );
}

/** Annulation d'un brouillon ou d'un message approuvé non envoyé. */
export function annulerMessage(administrateur: string, message: string) {
  return avecUtilisateur(administrateur, (client) =>
    client
      .query("select annuler_message_recrutement($1) as ok", [message])
      .then((r) => r.rows[0].ok === true),
  );
}

/**
 * Envoi d'un message approuvé par le service de messagerie (simulé tant qu'aucun fournisseur n'est choisi).
 * La base vérifie l'approbation, l'empreinte, l'opposition, la relance unique et le délai juste avant l'envoi.
 */
export async function envoyerMessageRecrutement(
  message: string,
  delaiRelanceJours: number,
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  try {
    await avecServiceMessagerie(async (client) => {
      const { rows } = await client.query(
        "select contact, objet, texte from envoyer_message_recrutement($1, $2)",
        [message, delaiRelanceJours],
      );
      // Dans la même transaction : si l'envoi échoue, le message reste « approuvé ».
      await envoyerMessage(rows[0].contact, rows[0].texte, rows[0].objet);
    });
    return { ok: true };
  } catch (erreur) {
    if (erreur instanceof DatabaseError && ["42501", "22023"].includes(erreur.code ?? ""))
      return { ok: false, erreur: erreur.message };
    throw erreur;
  }
}

/** Statuts que le propriétaire fixe lui-même : entretien mené, accord signé (hors plateforme). */
export const STATUTS_PROPRIETAIRE = ["entretien", "signe"] as const;

export function changerStatutCandidat(
  administrateur: string,
  id: string,
  statut: (typeof STATUTS_PROPRIETAIRE)[number],
) {
  return avecUtilisateur(administrateur, (client) =>
    client
      .query(
        `update candidats set statut = $2, maj_le = now()
         where id = $1 and statut not in ('refus', 'suppression_demandee')`,
        [id, statut],
      )
      .then((r) => (r.rowCount ?? 0) > 0),
  );
}

/** Suppression de la fiche et des messages ; seule l'empreinte du contact reste dans la liste d'opposition. */
export function supprimerCandidat(administrateur: string, id: string) {
  return avecUtilisateur(administrateur, (client) =>
    client.query("select supprimer_candidat($1) as ok", [id]).then((r) => r.rows[0].ok === true),
  );
}
