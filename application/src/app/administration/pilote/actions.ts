"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { messageSigne } from "@/lib/serveur/message-adresse";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { definirChapitresPilote } from "@/lib/serveur/pilote";

export async function enregistrer(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const unite = String(donnees.get("unite") ?? "");
  const chapitres = donnees.getAll("chapitre").map(String).filter(Boolean);
  const erreur = await definirChapitresPilote(administrateur, unite, chapitres);
  revalidatePath("/administration/pilote");
  const parametres = new URLSearchParams({
    unite,
    ...(erreur ? messageSigne({ erreur }) : { enregistre: "1" }),
  });
  redirect(`/administration/pilote?${parametres}`);
}
