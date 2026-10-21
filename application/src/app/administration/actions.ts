"use server";

import { revalidatePath } from "next/cache";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import {
  changerAccesEleves,
  reactiverAgent,
  supprimerDocumentOfficiel,
  traiterFileHumaine,
} from "@/lib/serveur/administration";
import { fermerToutesLesSessions } from "@/lib/serveur/session";

export async function reactiver(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  await reactiverAgent(administrateur, String(donnees.get("agent") ?? ""));
  revalidatePath("/administration");
}

export async function traiter(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  await traiterFileHumaine(
    administrateur,
    String(donnees.get("nature") ?? ""),
    String(donnees.get("id") ?? ""),
    String(donnees.get("decision") ?? ""),
  );
  revalidatePath("/administration");
}

export async function basculerAccesEleves(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  await changerAccesEleves(
    administrateur,
    donnees.get("ouvert") === "oui",
    String(donnees.get("motif") ?? "").trim() || null,
  );
  revalidatePath("/administration");
}

export async function supprimerDocument(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  if (donnees.get("confirmation") !== "oui") return;
  await supprimerDocumentOfficiel(administrateur, String(donnees.get("document") ?? ""));
  revalidatePath("/administration");
}

/** Incident (dossier de production §8) : toutes les sessions fermées, sauf celle du propriétaire. */
export async function deconnecterTout(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  if (donnees.get("confirmation") !== "oui") return;
  await fermerToutesLesSessions(administrateur);
  revalidatePath("/administration");
}
