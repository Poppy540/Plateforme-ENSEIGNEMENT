"use server";

import { revalidatePath } from "next/cache";
import { exigerEleveActif } from "@/lib/serveur/acces-eleve";
import { adresseDuSite } from "@/lib/serveur/origine";
import { demanderAccordRapports, retirerAccordRapports } from "@/lib/serveur/rapports-parents";
import { enregistrerPreferences, mettreAJourPlan } from "@/lib/serveur/tuteur";

export type EtatPlan = { erreur?: string; succes?: string } | undefined;

export async function enregistrer(_etat: EtatPlan, donnees: FormData): Promise<EtatPlan> {
  const eleve = await exigerEleveActif();
  const minutes = String(donnees.get("minutes") ?? "").trim();
  const connexion = String(donnees.get("connexion") ?? "");
  const erreur = await enregistrerPreferences(eleve, {
    minutesParJour: minutes ? Number(minutes) : null,
    connexion: (connexion || null) as "lente" | null,
    rappelsActifs: donnees.get("rappels") === "oui",
    frequenceRappels: String(donnees.get("frequence") ?? "hebdomadaire") as "hebdomadaire",
  });
  if (erreur) return { erreur };
  revalidatePath("/espace/plan");
  return { succes: "Préférences enregistrées." };
}

export async function actualiser(_etat: EtatPlan, donnees: FormData): Promise<EtatPlan> {
  const eleve = await exigerEleveActif();
  const resultat = await mettreAJourPlan(
    eleve,
    String(donnees.get("message") ?? "").trim() || null,
  );
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath("/espace/plan");
  return undefined;
}

export async function proposerRapports(_etat: EtatPlan, donnees: FormData): Promise<EtatPlan> {
  const eleve = await exigerEleveActif();
  const contact = String(donnees.get("contact") ?? "").trim() || null;
  const erreur = await demanderAccordRapports(eleve, contact, await adresseDuSite());
  if (erreur) return { erreur };
  revalidatePath("/espace/plan");
  return { succes: "Demande envoyée à ton parent ou tuteur." };
}

export async function retirerRapports(): Promise<void> {
  const eleve = await exigerEleveActif();
  await retirerAccordRapports(eleve);
  revalidatePath("/espace/plan");
}
