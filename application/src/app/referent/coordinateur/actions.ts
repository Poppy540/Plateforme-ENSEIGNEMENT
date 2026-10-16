"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { deciderProposition, lancerRevue } from "@/lib/serveur/coordinateur";

export type EtatCoordinateur = { erreur?: string; succes?: string } | undefined;

export async function demanderRevue(
  _etat: EtatCoordinateur,
  donnees: FormData,
): Promise<EtatCoordinateur> {
  const referent = await exigerReferent();
  const resultat = await lancerRevue(
    referent,
    String(donnees.get("famille") ?? ""),
    String(donnees.get("consigne") ?? "").trim() || null,
  );
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath("/referent");
  if (resultat.rapportId) redirect(`/referent/coordinateur/${resultat.rapportId}`);
  return { succes: resultat.message };
}

const ACTIONS = [
  "accepter_lien",
  "ecarter_lien",
  "ecarter_glossaire",
  "adopter_glossaire",
  "clore",
] as const;

export async function decider(
  _etat: EtatCoordinateur,
  donnees: FormData,
): Promise<EtatCoordinateur> {
  const referent = await exigerReferent();
  const rapport = String(donnees.get("rapport") ?? "");
  const action = String(donnees.get("action") ?? "") as (typeof ACTIONS)[number];
  if (!ACTIONS.includes(action)) return { erreur: "Action inconnue." };
  const erreur = await deciderProposition(
    referent,
    rapport,
    action,
    Number(donnees.get("indice") ?? 0),
    String(donnees.get("commentaire") ?? "").trim() || null,
  );
  if (erreur) return { erreur };
  revalidatePath(`/referent/coordinateur/${rapport}`);
  revalidatePath("/referent");
  return undefined;
}
