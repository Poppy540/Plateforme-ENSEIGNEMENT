"use server";

import { revalidatePath } from "next/cache";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import {
  annulerInvitationsEnseignant,
  creerClasse,
  nouveauCodeClasse,
  nouvelleInvitationEnseignant,
  type ResultatCodes,
} from "@/lib/serveur/classes-administration";

const texte = (d: FormData, nom: string) => String(d.get(nom) ?? "").trim();

export async function creer(_etat: ResultatCodes | undefined, d: FormData): Promise<ResultatCodes> {
  const administrateur = await exigerAdministrateur();
  const resultat = await creerClasse(administrateur, {
    referentiel: texte(d, "referentiel"),
    niveau: texte(d, "niveau"),
    serie: texte(d, "serie"),
    nom: texte(d, "nom").slice(0, 200),
    etablissement: texte(d, "etablissement").slice(0, 300),
    joursCode: Number(texte(d, "jours_code") || "120"),
    joursInvitation: Number(texte(d, "jours_invitation") || "14"),
  });
  revalidatePath("/administration/classes");
  return resultat;
}

export async function codeClasse(
  _etat: ResultatCodes | undefined,
  d: FormData,
): Promise<ResultatCodes> {
  const administrateur = await exigerAdministrateur();
  const resultat = await nouveauCodeClasse(administrateur, texte(d, "classe"), 120);
  revalidatePath("/administration/classes");
  return resultat;
}

export async function invitationEnseignant(
  _etat: ResultatCodes | undefined,
  d: FormData,
): Promise<ResultatCodes> {
  const administrateur = await exigerAdministrateur();
  const resultat = await nouvelleInvitationEnseignant(administrateur, texte(d, "classe"), 14);
  revalidatePath("/administration/classes");
  return resultat;
}

export async function annulerInvitations(d: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  await annulerInvitationsEnseignant(administrateur, texte(d, "classe"));
  revalidatePath("/administration/classes");
}
