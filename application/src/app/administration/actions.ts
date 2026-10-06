"use server";

import { revalidatePath } from "next/cache";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { reactiverAgent } from "@/lib/serveur/administration";

export async function reactiver(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  await reactiverAgent(administrateur, String(donnees.get("agent") ?? ""));
  revalidatePath("/administration");
}
