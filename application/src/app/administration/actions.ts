"use server";

import { revalidatePath } from "next/cache";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import {
  changerAccesEleves,
  reactiverAgent,
  traiterFileHumaine,
} from "@/lib/serveur/administration";

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
