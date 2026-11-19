"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TACHES, type Tache } from "@/lib/agents/recruteur/tache";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import {
  annulerMessage,
  approuverMessage,
  changerStatutCandidat,
  creerCandidat,
  envoyerMessageRecrutement,
  referentielsRecrutement,
  STATUTS_PROPRIETAIRE,
  supprimerCandidat,
} from "@/lib/serveur/recrutement";
import { executerTacheRecruteur } from "@/lib/serveur/recrutement-execution";

export type EtatRecrutement =
  { erreur?: string; succes?: string; refus?: string; details?: string[] } | undefined;

const champ = (d: FormData, nom: string) => String(d.get(nom) ?? "");

export async function ajouterCandidat(
  _etat: EtatRecrutement,
  d: FormData,
): Promise<EtatRecrutement> {
  const administrateur = await exigerAdministrateur();
  const r = await creerCandidat(administrateur, {
    referentiel: champ(d, "referentiel"),
    nom: champ(d, "nom"),
    famille: champ(d, "famille"),
    niveau: champ(d, "niveau"),
    structure: champ(d, "structure"),
    contact: champ(d, "contact"),
    source: champ(d, "source"),
    sourceDetail: champ(d, "source_detail"),
  });
  if (!r.ok) return { erreur: r.erreur };
  revalidatePath("/administration/recrutement");
  redirect(`/administration/recrutement/${r.id}`);
}

export async function demanderTache(_etat: EtatRecrutement, d: FormData): Promise<EtatRecrutement> {
  const administrateur = await exigerAdministrateur();
  const tache = champ(d, "tache") as Tache;
  if (!TACHES.includes(tache)) return { erreur: "Tâche inconnue." };
  const id = champ(d, "candidat");
  const r = await executerTacheRecruteur({
    administrateur,
    candidatId: id,
    tache,
    informations: champ(d, "informations").trim().slice(0, 8000) || null,
    consigne: champ(d, "consigne").trim().slice(0, 2000) || null,
  });
  if (!r.ok) return { erreur: r.erreur };
  revalidatePath(`/administration/recrutement/${id}`);
  const faits = [
    r.messageCree ? "brouillon de message à approuver" : "",
    r.dossierCree ? "dossier d'accord (brouillon)" : "",
    r.sortie.actions.length ? `actions : ${r.sortie.actions.join(", ")}` : "",
  ].filter(Boolean);
  return {
    succes: r.sortie.reponse_au_responsable || "Tâche terminée.",
    refus: r.sortie.refus || undefined,
    details: [
      ...faits,
      ...(r.sortie.escalade ? [`À traiter : ${r.sortie.escalade}`] : []),
      ...r.problemes.map((p) => `Contrôle du serveur : ${p}`),
    ],
  };
}

export async function approuver(d: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  await approuverMessage(administrateur, champ(d, "message"), champ(d, "empreinte"));
  revalidatePath(`/administration/recrutement/${champ(d, "candidat")}`);
}

export async function annuler(d: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  await annulerMessage(administrateur, champ(d, "message"));
  revalidatePath(`/administration/recrutement/${champ(d, "candidat")}`);
}

export async function envoyer(_etat: EtatRecrutement, d: FormData): Promise<EtatRecrutement> {
  const administrateur = await exigerAdministrateur();
  const id = champ(d, "candidat");
  const referentiels = await referentielsRecrutement(administrateur);
  const delai =
    referentiels.find((r) => r.id === champ(d, "referentiel"))?.configuration?.delaiRelanceJours ??
    7;
  const r = await envoyerMessageRecrutement(champ(d, "message"), delai);
  revalidatePath(`/administration/recrutement/${id}`);
  return r.ok ? { succes: "Message envoyé (envoi simulé)." } : { erreur: r.erreur };
}

export async function changerStatut(d: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const statut = champ(d, "statut") as (typeof STATUTS_PROPRIETAIRE)[number];
  if (!STATUTS_PROPRIETAIRE.includes(statut)) return;
  await changerStatutCandidat(administrateur, champ(d, "candidat"), statut);
  revalidatePath(`/administration/recrutement/${champ(d, "candidat")}`);
}

export async function supprimer(d: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  await supprimerCandidat(administrateur, champ(d, "candidat"));
  revalidatePath("/administration/recrutement");
  redirect("/administration/recrutement");
}
