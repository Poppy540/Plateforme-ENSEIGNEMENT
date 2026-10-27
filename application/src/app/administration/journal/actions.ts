"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { noterJournal } from "@/lib/serveur/journal-pilote";

export async function noter(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const erreur = await noterJournal(
    administrateur,
    String(donnees.get("type") ?? ""),
    String(donnees.get("texte") ?? ""),
    String(donnees.get("critere") ?? ""),
  );
  revalidatePath("/administration/journal");
  const parametres = new URLSearchParams(
    erreur ? { erreur } : { ok: "Entrée ajoutée au journal." },
  );
  redirect(`/administration/journal?${parametres}`);
}
