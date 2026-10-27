"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { declarerCritere, leverCritere } from "@/lib/serveur/criteres-pilote";

function retour(critere: string, erreur: string | null, message: string): never {
  revalidatePath("/administration/criteres");
  const parametres = new URLSearchParams(erreur ? { erreur } : { ok: message });
  redirect(`/administration/criteres?${parametres}#critere-${critere}`);
}

const code = (donnees: FormData) => String(donnees.get("critere") ?? "").slice(0, 40);

export async function declarer(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const critere = code(donnees);
  const erreur = await declarerCritere(administrateur, critere, String(donnees.get("motif") ?? ""));
  retour(critere, erreur, "Critère déclaré.");
}

export async function lever(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const critere = code(donnees);
  const erreur = await leverCritere(administrateur, critere, String(donnees.get("motif") ?? ""));
  retour(critere, erreur, "Critère levé.");
}
