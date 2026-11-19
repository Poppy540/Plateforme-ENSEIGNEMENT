import "server-only";
import { DatabaseError } from "pg";
import type { RapportConformite } from "@/lib/agents/conformite/rapport";
import { avecUtilisateur } from "./base";
import { etatTache, soumettre } from "./orchestrateur";

// Conformité programme côté référent (ADR 0039) : dépôt de documents officiels, demande d'analyse (par
// l'Orchestrateur), lecture et clôture des rapports d'écart. Les droits sont vérifiés par la base.

export const TAILLE_PDF_MAX = 10 * 1024 * 1024;
export const TAILLE_TEXTE_MAX = 400_000;

export interface DocumentOfficiel {
  id: string;
  titre: string;
  origine: string;
  declareOfficiel: boolean;
  format: "texte" | "pdf";
  empreinte: string;
  deposeLe: string;
}

export interface UniteAnalysable {
  id: string;
  code: string;
  libelle: string;
}

/** Documents et unités que le référent peut analyser (unités des familles qu'il couvre). */
export function espaceConformite(referent: string) {
  return avecUtilisateur(referent, async (client) => {
    const documents = (
      await client.query(
        `select id, titre, origine, declare_officiel as "declareOfficiel", format, empreinte, depose_le as "deposeLe"
         from documents_officiels order by depose_le desc limit 50`,
      )
    ).rows as DocumentOfficiel[];
    const unites = (
      await client.query(
        `select u.id, u.code, coalesce(u.libelle_local, m.libelle) || ' — ' || n.libelle as libelle
         from unites u join matieres m on m.id = u.matiere_id join niveaux n on n.id = u.niveau_id
         where est_referent_unite(u.id) and exists (select 1 from chapitres c where c.unite_id = u.id)
         order by n.ordre, u.code`,
      )
    ).rows as UniteAnalysable[];
    const rapports = (
      await client.query(
        `select r.id, r.version, r.statut, r.cree_le as "creeLe", d.titre as document, u.code as unite
         from rapports_conformite r join documents_officiels d on d.id = r.document_id join unites u on u.id = r.unite_id
         order by r.cree_le desc limit 30`,
      )
    ).rows as {
      id: string;
      version: number;
      statut: string;
      creeLe: string;
      document: string;
      unite: string;
    }[];
    const referentiel = (
      await client.query(
        "select referentiel_id from referents_familles where referent_id = $1 order by referentiel_id limit 1",
        [referent],
      )
    ).rows[0]?.referentiel_id as string | undefined;
    return { documents, unites, rapports, referentiel: referentiel ?? null };
  });
}

/** Dépôt d'un document (texte ou PDF) ; renvoie un message d'erreur ou null. */
export async function deposerDocument(
  referent: string,
  d: {
    titre: string;
    origine: string;
    declareOfficiel: boolean;
    texte: string | null;
    pdf: Buffer | null;
  },
): Promise<string | null> {
  if (!d.titre.trim() || d.titre.length > 200) return "Titre de 1 à 200 caractères.";
  if (!d.origine.trim() || d.origine.length > 500)
    return "Indiquez l'origine du document (organisme, référence ou lien).";
  if (!d.texte?.trim() && !d.pdf) return "Collez le texte du document ou joignez un PDF.";
  if (d.texte && d.pdf) return "Un texte ou un PDF, pas les deux.";
  if (d.texte && d.texte.length > TAILLE_TEXTE_MAX)
    return "Texte trop long (400 000 caractères au plus).";
  if (d.pdf && d.pdf.length > TAILLE_PDF_MAX) return "PDF trop lourd (10 Mo au plus).";
  if (d.pdf && d.pdf.subarray(0, 5).toString("latin1") !== "%PDF-")
    return "Ce fichier n'est pas un PDF.";
  const { referentiel } = await espaceConformite(referent);
  if (!referentiel) return "Aucun référentiel dans votre périmètre.";
  try {
    await avecUtilisateur(referent, (client) =>
      client.query("select deposer_document_officiel($1, $2, $3, $4, $5, $6)", [
        referentiel,
        d.titre.trim(),
        d.origine.trim(),
        d.declareOfficiel,
        // Fins de ligne normalisées (un formulaire envoie « \r\n ») : l'empreinte ne dépend pas du navigateur.
        d.texte?.replace(/\r\n?/g, "\n").trim() || null,
        d.pdf,
      ]),
    );
    return null;
  } catch (erreur) {
    if (erreur instanceof DatabaseError && ["42501", "22023", "23514"].includes(erreur.code ?? ""))
      return "Dépôt refusé.";
    throw erreur;
  }
}

export type ResultatAnalyseDemandee =
  { ok: true; message: string; rapportId: string | null } | { ok: false; erreur: string };

/** Demande d'analyse d'un document pour une unité : la tâche passe par l'Orchestrateur (agent conformite). */
export async function demanderAnalyse(
  referent: string,
  documentId: string,
  uniteId: string,
  consigne: string | null,
): Promise<ResultatAnalyseDemandee> {
  if (consigne && consigne.length > 2000)
    return { ok: false, erreur: "Consigne trop longue (2000 caractères)." };
  const cible = await avecUtilisateur(referent, async (client) => {
    if (![documentId, uniteId].every((x) => /^[0-9a-f-]{36}$/.test(x))) return null;
    return (
      await client.query(
        `select d.id as document_id, d.referentiel_id, u.id as unite_id, u.code, r.pays_code
         from documents_officiels d join unites u on u.referentiel_id = d.referentiel_id and u.id = $2
         join referentiels r on r.id = d.referentiel_id
         where d.id = $1 and est_referent_unite(u.id)`,
        [documentId, uniteId],
      )
    ).rows[0];
  });
  if (!cible) return { ok: false, erreur: "Document ou unité hors de votre périmètre." };
  const soumission = await soumettre(
    { nature: "comparaison_programme", uniteCode: cible.code },
    {
      acteur: { role: "referent", id: referent },
      codePays: cible.pays_code,
      demandeePar: referent,
      entreesServeur: {
        referentiel_id: cible.referentiel_id,
        unite_id: cible.unite_id,
        document_id: cible.document_id,
        demande_par: referent,
        donnees_non_fiables: { details: consigne ?? "" },
      },
    },
  );
  if (soumission.statut === "refusee") return { ok: false, erreur: soumission.motif };
  if (soumission.statut === "question") return { ok: false, erreur: soumission.question };
  if (soumission.statut !== "en_attente")
    return { ok: false, erreur: `Analyse en attente : ${soumission.motif ?? soumission.statut}` };
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
    return { ok: false, erreur: `Analyse en échec : ${tache.motif ?? "voir l'administration"}` };
  return {
    ok: true,
    message: "Analyse demandée : elle sera traitée par la file de tâches.",
    rapportId: null,
  };
}

export interface RapportConformiteDetaille {
  id: string;
  version: number;
  statut: "brouillon" | "traite";
  creeLe: string;
  unite: string;
  document: { titre: string; origine: string; declareOfficiel: boolean; empreinte: string };
  contenu: RapportConformite;
  controles: string[];
}

export function rapportConformite(
  referent: string,
  id: string,
): Promise<RapportConformiteDetaille | null> {
  return avecUtilisateur(referent, async (client) => {
    if (!/^[0-9a-f-]{36}$/.test(id)) return null;
    const r = (
      await client.query(
        `select r.id, r.version, r.statut, r.cree_le as "creeLe", u.code as unite, r.contenu, r.controles,
           json_build_object('titre', d.titre, 'origine', d.origine, 'declareOfficiel', d.declare_officiel,
             'empreinte', d.empreinte) as document
         from rapports_conformite r join unites u on u.id = r.unite_id
         join documents_officiels d on d.id = r.document_id
         where r.id = $1`,
        [id],
      )
    ).rows[0];
    return (r as RapportConformiteDetaille | undefined) ?? null;
  });
}

export async function cloreRapportConformite(referent: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  return avecUtilisateur(referent, (client) =>
    client
      .query("select clore_rapport_conformite($1) as ok", [id])
      .then((r) => r.rows[0].ok as boolean),
  );
}
