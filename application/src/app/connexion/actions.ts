"use server";

import { redirect } from "next/navigation";
import { codeValide, lireIdentifiant } from "@/lib/identifiants";
import { fournisseurAuthentification } from "@/lib/serveur/authentification/fournisseur";
import {
  identifiantEnCours,
  memoriserIdentifiant,
  oublierIdentifiant,
} from "@/lib/serveur/connexion-en-cours";
import { MESSAGE_INDICATIF, numeroAccepte } from "@/lib/serveur/indicatifs";
import { envoiAutorise, rendreEssai, verificationAutorisee } from "@/lib/serveur/limites-connexion";
import { fermerSession, ouvrirSession } from "@/lib/serveur/session";

export type EtatFormulaire = { erreur?: string } | undefined;

export async function demanderCode(
  _etat: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const identifiant = lireIdentifiant(String(donnees.get("identifiant") ?? ""));
  if (!identifiant) {
    return {
      erreur:
        "Entre un numéro au format international (commençant par + et l’indicatif du pays) ou une adresse email.",
    };
  }
  if (identifiant.type === "telephone" && !(await numeroAccepte(identifiant.valeur)))
    return { erreur: MESSAGE_INDICATIF };
  if (!(await envoiAutorise(identifiant)))
    return { erreur: "Trop de demandes de code. Attends un quart d'heure avant de réessayer." };
  try {
    await (await fournisseurAuthentification()).envoyerCode(identifiant);
  } catch {
    return { erreur: "Le code n'a pas pu être envoyé. Réessaie dans quelques minutes." };
  }
  await memoriserIdentifiant(identifiant);
  redirect("/connexion/code");
}

export async function verifierCode(
  _etat: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const identifiant = await identifiantEnCours();
  if (!identifiant) redirect("/connexion");
  const code = codeValide(String(donnees.get("code") ?? ""));
  if (!code) return { erreur: "Le code contient 6 chiffres." };
  if (!(await verificationAutorisee(identifiant)))
    return { erreur: "Trop d'essais. Demande un nouveau code dans un quart d'heure." };

  const utilisateur = await (await fournisseurAuthentification()).verifierCode(identifiant, code);
  if (!utilisateur) return { erreur: "Code incorrect ou expiré." };
  await rendreEssai(identifiant);

  await oublierIdentifiant();
  await ouvrirSession(utilisateur);
  redirect("/espace");
}

export async function seDeconnecter(): Promise<void> {
  await fermerSession();
  redirect("/");
}
