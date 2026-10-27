"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { supprimerDocumentOfficiel, traiterFileHumaine } from "@/lib/serveur/administration";
import {
  fermerAcces,
  reprendreAgent,
  rouvrirAcces,
  suspendreAgent,
  type Reprise,
} from "@/lib/serveur/journal-pilote";
import { fermerToutesLesSessions } from "@/lib/serveur/session";

const champ = (donnees: FormData, nom: string) => String(donnees.get(nom) ?? "");

/** Les 4 points d'une reprise (docs/pilote/criteres-arret.md), vérifiés aussi par la base. */
const reprise = (donnees: FormData): Reprise => ({
  cause: champ(donnees, "cause"),
  correction: champ(donnees, "correction"),
  accord: donnees.get("accord") === "oui",
  etablissement: donnees.get("etablissement") === "oui",
});

function retour(ancre: string, erreur: string | null, message: string): never {
  revalidatePath("/administration");
  const parametres = new URLSearchParams(erreur ? { erreur } : { ok: message });
  redirect(`/administration?${parametres}#${ancre}`);
}

export async function suspendre(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const agent = champ(donnees, "agent");
  const erreur = await suspendreAgent(
    administrateur,
    agent,
    champ(donnees, "motif"),
    champ(donnees, "critere"),
  );
  retour("agents", erreur, `Agent ${agent} suspendu ; décision notée au journal du pilote.`);
}

export async function reactiver(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const agent = champ(donnees, "agent");
  const erreur = await reprendreAgent(administrateur, agent, reprise(donnees));
  retour("agents", erreur, `Agent ${agent} réactivé ; reprise notée au journal du pilote.`);
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

export async function fermerAccesEleves(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const erreur = await fermerAcces(
    administrateur,
    champ(donnees, "motif"),
    champ(donnees, "critere"),
  );
  retour("acces", erreur, "Accès des élèves fermé ; décision notée au journal du pilote.");
}

export async function rouvrirAccesEleves(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  const erreur = await rouvrirAcces(administrateur, reprise(donnees));
  retour("acces", erreur, "Accès des élèves rouvert ; reprise notée au journal du pilote.");
}

export async function supprimerDocument(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  if (donnees.get("confirmation") !== "oui") return;
  await supprimerDocumentOfficiel(administrateur, String(donnees.get("document") ?? ""));
  revalidatePath("/administration");
}

/** Incident (dossier de production §8) : toutes les sessions fermées, sauf celle du propriétaire. */
export async function deconnecterTout(donnees: FormData): Promise<void> {
  const administrateur = await exigerAdministrateur();
  if (donnees.get("confirmation") !== "oui") return;
  await fermerToutesLesSessions(administrateur);
  revalidatePath("/administration");
}
