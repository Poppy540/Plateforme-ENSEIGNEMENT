"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { definirPeriode } from "@/lib/serveur/fin-pilote";

export async function enregistrerPeriode(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const erreur = await definirPeriode(
    administrateur,
    String(donnees.get("debut") ?? ""),
    String(donnees.get("fin") ?? ""),
  );
  revalidatePath("/administration/fin-pilote");
  const parametres = new URLSearchParams(
    erreur ? { erreur } : { ok: "Période du pilote enregistrée." },
  );
  redirect(`/administration/fin-pilote?${parametres}`);
}
