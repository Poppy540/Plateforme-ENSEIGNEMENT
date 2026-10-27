import "server-only";
import { DatabaseError } from "pg";
import { dossierPack, racineDepot } from "@/lib/agents/chargeur-prompt";
import { empreinteCode, genererCodeInvitation } from "@/lib/invitation";
import { libellesFamilles } from "@/lib/pack-pays/lecture";
import { avecUtilisateur } from "./base";
import { empreinteActeur } from "./orchestrateur";

// Invitations de référents depuis l'administration (ADR 0066). Le code est tiré ici, rendu une seule fois à
// l'administration, et jamais gardé : la base ne reçoit que son empreinte (contrôles et audit en base).

export interface OptionInvitation {
  referentiel: string;
  familles: { code: string; libelle: string }[];
}

export async function optionsInvitation(administrateur: string): Promise<OptionInvitation[]> {
  const lignes = await avecUtilisateur(administrateur, async (client) => {
    const { rows } = await client.query(
      "select referentiel, pays, familles from options_invitation_referent()",
    );
    return rows as { referentiel: string; pays: string; familles: string[] }[];
  });
  return lignes.map((l) => {
    let libelles: Record<string, string> = {};
    try {
      libelles = libellesFamilles(dossierPack(racineDepot(), l.pays));
    } catch {
      // Pays sans pack sur ce serveur : les codes des familles s'affichent tels quels.
    }
    return {
      referentiel: l.referentiel,
      familles: l.familles.map((code) => ({ code, libelle: libelles[code] ?? code })),
    };
  });
}

export type ResultatInvitation =
  { ok: true; code: string; expireDans: number } | { ok: false; erreur: string };

export async function creerInvitationReferent(
  administrateur: string,
  referentiel: string,
  familles: string[],
  jours: number,
): Promise<ResultatInvitation> {
  const code = genererCodeInvitation();
  try {
    await avecUtilisateur(administrateur, (client) =>
      client.query("select creer_invitation_referent($1, $2, $3, $4, $5)", [
        referentiel,
        familles,
        jours,
        empreinteCode(code),
        empreinteActeur(administrateur),
      ]),
    );
    return { ok: true, code, expireDans: jours };
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "22023")
      return { ok: false, erreur: erreur.message };
    throw erreur;
  }
}

export interface InvitationListee {
  id: string;
  referentiel: string;
  familles: string[];
  cree_le: Date;
  expire_le: Date;
  etat: "en_attente" | "utilisee" | "expiree" | "annulee";
  referent: string | null;
}

export function invitationsReferents(administrateur: string): Promise<InvitationListee[]> {
  return avecUtilisateur(administrateur, async (client) => {
    const { rows } = await client.query(
      "select id, referentiel, familles, cree_le, expire_le, etat, referent from invitations_referents_admin()",
    );
    return rows;
  });
}

export function annulerInvitationReferent(administrateur: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return Promise.resolve(false);
  return avecUtilisateur(administrateur, (client) =>
    client
      .query("select annuler_invitation_referent($1, $2) as ok", [
        id,
        empreinteActeur(administrateur),
      ])
      .then((r) => r.rows[0].ok as boolean),
  );
}
