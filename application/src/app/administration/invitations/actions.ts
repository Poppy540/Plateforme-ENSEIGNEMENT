"use server";

import { revalidatePath } from "next/cache";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import {
  annulerInvitationReferent,
  creerInvitationReferent,
  type ResultatInvitation,
} from "@/lib/serveur/invitations";

export async function creer(
  _etat: ResultatInvitation | undefined,
  donnees: FormData,
): Promise<ResultatInvitation> {
  const administrateur = await exigerAdministrateur();
  const referentiel = String(donnees.get("referentiel") ?? "");
  const familles = donnees.getAll("famille").map(String).filter(Boolean);
  const jours = Number(donnees.get("jours") ?? "14");
  if (familles.length === 0)
    return { ok: false, erreur: "Cochez au moins une famille de matières." };
  const resultat = await creerInvitationReferent(administrateur, referentiel, familles, jours);
  revalidatePath("/administration/invitations");
  return resultat;
}

export async function annuler(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  await annulerInvitationReferent(administrateur, String(donnees.get("id") ?? ""));
  revalidatePath("/administration/invitations");
}
