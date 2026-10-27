"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { cocherCondition, decocherCondition } from "@/lib/serveur/conditions-pilote";

function retour(numero: number, erreur: string | null, message: string): never {
  revalidatePath("/administration/conditions");
  const parametres = new URLSearchParams(
    erreur ? { erreur, condition: String(numero) } : { ok: message },
  );
  redirect(`/administration/conditions?${parametres}#condition-${numero}`);
}

export async function cocher(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const numero = Number(donnees.get("numero"));
  const erreur = await cocherCondition(
    administrateur,
    numero,
    String(donnees.get("preuve") ?? ""),
    String(donnees.get("date") ?? ""),
  );
  retour(numero, erreur, `Condition ${numero} cochée.`);
}

export async function decocher(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const numero = Number(donnees.get("numero"));
  const erreur = await decocherCondition(
    administrateur,
    numero,
    String(donnees.get("motif") ?? ""),
  );
  retour(numero, erreur, `Coche de la condition ${numero} retirée.`);
}
