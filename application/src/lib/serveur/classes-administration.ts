import "server-only";
import { DatabaseError } from "pg";
import { empreinteCode, genererCodeInvitation } from "@/lib/invitation";
import { avecUtilisateur } from "./base";
import { empreinteActeur } from "./orchestrateur";

// Classes du pilote depuis l'administration (ADR 0067). Les codes sont tirés ici, rendus une seule fois, jamais
// gardés : la base ne reçoit que leurs empreintes (contrôles et audit en base).

export interface OptionClasse {
  referentiel: string;
  niveaux: { code: string; libelle: string }[];
  series: { code: string; libelle: string }[];
}

export function optionsClasse(administrateur: string): Promise<OptionClasse[]> {
  return avecUtilisateur(administrateur, async (client) => {
    const { rows } = await client.query("select options_classe() as o");
    return rows[0].o as OptionClasse[];
  });
}

/** Codes affichés une seule fois (null = non concerné par l'action). */
export type ResultatCodes =
  | { ok: true; codeClasse: string | null; codeEnseignant: string | null }
  | { ok: false; erreur: string };

async function avecErreurMetier(traitement: () => Promise<ResultatCodes>): Promise<ResultatCodes> {
  try {
    return await traitement();
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "22023")
      return { ok: false, erreur: erreur.message };
    throw erreur;
  }
}

export function creerClasse(
  administrateur: string,
  d: {
    referentiel: string;
    niveau: string;
    serie: string;
    nom: string;
    etablissement: string;
    joursCode: number;
    joursInvitation: number;
    /** Effectif annoncé (D10, ADR 0093). */
    capacite: number;
  },
): Promise<ResultatCodes> {
  const codeClasse = genererCodeInvitation();
  const codeEnseignant = genererCodeInvitation();
  return avecErreurMetier(async () => {
    // Une seule transaction : la classe n'existe jamais sans sa capacité.
    await avecUtilisateur(administrateur, async (client) => {
      const { rows } = await client.query(
        "select creer_classe($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) as id",
        [
          d.referentiel,
          d.niveau,
          d.serie,
          d.nom,
          d.etablissement,
          empreinteCode(codeClasse),
          empreinteCode(codeEnseignant),
          d.joursCode,
          d.joursInvitation,
          empreinteActeur(administrateur),
        ],
      );
      await client.query("select definir_capacite_classe($1, $2, $3)", [
        rows[0].id,
        d.capacite,
        empreinteActeur(administrateur),
      ]);
    });
    return { ok: true, codeClasse, codeEnseignant };
  });
}

export interface ClasseListee {
  id: string;
  referentiel: string;
  niveau: string;
  serie: string | null;
  nom: string;
  etablissement: string;
  eleves: number;
  code_expire_le: Date;
  code_valide: boolean;
  enseignants: string[];
  invitation_en_attente: boolean;
  /** Effectif annoncé ; null = sans limite (classe créée avant D10). */
  capacite: number | null;
}

export function classesAdministration(administrateur: string): Promise<ClasseListee[]> {
  return avecUtilisateur(administrateur, async (client) => {
    const { rows } = await client.query("select * from classes_admin()");
    return rows;
  });
}

const UUID = /^[0-9a-f-]{36}$/;

export function nouveauCodeClasse(
  administrateur: string,
  classe: string,
  jours: number,
): Promise<ResultatCodes> {
  if (!UUID.test(classe)) return Promise.resolve({ ok: false, erreur: "Classe inconnue." });
  const code = genererCodeInvitation();
  return avecErreurMetier(async () => {
    const ok = await avecUtilisateur(administrateur, (client) =>
      client
        .query("select nouveau_code_classe($1, $2, $3, $4) as ok", [
          classe,
          empreinteCode(code),
          jours,
          empreinteActeur(administrateur),
        ])
        .then((r) => r.rows[0].ok as boolean),
    );
    return ok
      ? { ok: true, codeClasse: code, codeEnseignant: null }
      : { ok: false, erreur: "Classe inconnue." };
  });
}

export function nouvelleInvitationEnseignant(
  administrateur: string,
  classe: string,
  jours: number,
): Promise<ResultatCodes> {
  if (!UUID.test(classe)) return Promise.resolve({ ok: false, erreur: "Classe inconnue." });
  const code = genererCodeInvitation();
  return avecErreurMetier(async () => {
    const ok = await avecUtilisateur(administrateur, (client) =>
      client
        .query("select nouvelle_invitation_enseignant($1, $2, $3, $4) as ok", [
          classe,
          empreinteCode(code),
          jours,
          empreinteActeur(administrateur),
        ])
        .then((r) => r.rows[0].ok as boolean),
    );
    return ok
      ? { ok: true, codeClasse: null, codeEnseignant: code }
      : { ok: false, erreur: "Classe inconnue." };
  });
}

export async function annulerInvitationsEnseignant(
  administrateur: string,
  classe: string,
): Promise<void> {
  if (!UUID.test(classe)) return;
  await avecUtilisateur(administrateur, (client) =>
    client.query("select annuler_invitations_enseignant($1, $2)", [
      classe,
      empreinteActeur(administrateur),
    ]),
  );
}

/** Capacité d'une classe (D10, ADR 0093) : effectif annoncé, de 1 à 200. */
export async function definirCapacite(
  administrateur: string,
  classe: string,
  capacite: number,
): Promise<string | null> {
  if (!UUID.test(classe)) return "Classe inconnue.";
  const resultat = await avecErreurMetier(async () => {
    await avecUtilisateur(administrateur, (client) =>
      client.query("select definir_capacite_classe($1, $2, $3)", [
        classe,
        Number.isInteger(capacite) ? capacite : -1,
        empreinteActeur(administrateur),
      ]),
    );
    return { ok: true, codeClasse: "", codeEnseignant: "" };
  });
  return resultat.ok ? null : resultat.erreur;
}
