"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { cocherGeste, decocherGeste, noterDecisionFinale } from "@/lib/serveur/cloture-pilote";

const champ = (donnees: FormData, nom: string) => String(donnees.get(nom) ?? "");

function retour(ancre: string, erreur: string | null, message: string): never {
  revalidatePath("/administration/cloture");
  const parametres = new URLSearchParams(erreur ? { erreur } : { ok: message });
  redirect(`/administration/cloture?${parametres}#${ancre}`);
}

export async function decider(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const erreur = await noterDecisionFinale(
    administrateur,
    champ(donnees, "decision"),
    champ(donnees, "motif"),
  );
  retour("geste-decision_finale", erreur, "Décision finale notée au journal du pilote.");
}

export async function cocher(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const geste = champ(donnees, "geste").slice(0, 40);
  const erreur = await cocherGeste(
    administrateur,
    geste,
    champ(donnees, "preuve"),
    champ(donnees, "date"),
  );
  retour(`geste-${geste}`, erreur, "Geste coché.");
}

export async function decocher(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const geste = champ(donnees, "geste").slice(0, 40);
  const erreur = await decocherGeste(administrateur, geste, champ(donnees, "motif"));
  retour(`geste-${geste}`, erreur, "Coche retirée.");
}
