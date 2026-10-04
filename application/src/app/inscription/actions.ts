"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { normaliserEmail, normaliserTelephone } from "@/lib/identifiants";
import { urlPublique } from "@/lib/serveur/configuration";
import { envoyerMessage } from "@/lib/serveur/messagerie";
import { aUnProfil, inscrire, messageErreurMetier } from "@/lib/serveur/requetes";
import { utilisateurConnecte } from "@/lib/serveur/session";

export type EtatInscription = { erreur?: string } | undefined;

function champ(donnees: FormData, nom: string): string | null {
  const valeur = String(donnees.get(nom) ?? "").trim();
  return valeur === "" ? null : valeur;
}

export async function sInscrire(
  _etat: EtatInscription,
  donnees: FormData,
): Promise<EtatInscription> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  if (await aUnProfil(utilisateur)) redirect("/espace");

  const prenom = champ(donnees, "prenom");
  const referentiel = champ(donnees, "referentiel");
  const niveau = champ(donnees, "niveau");
  if (!prenom || prenom.length > 40)
    return { erreur: "Indique ton prénom ou un pseudonyme (40 caractères au plus)." };
  if (!referentiel || !niveau) return { erreur: "Choisis ta classe." };

  // « majeur » n'est proposé que si l'âge de la majorité du pays est connu ; sinon l'élève est traité comme mineur.
  const estMineur = champ(donnees, "majeur") !== "oui";
  const saisieParent = champ(donnees, "contact_parent");
  const contactParent = saisieParent
    ? (normaliserTelephone(saisieParent) ?? normaliserEmail(saisieParent))
    : null;
  if (estMineur && !contactParent) {
    return { erreur: "Indique le numéro (format international) ou l'email d'un parent ou tuteur." };
  }

  let jeton: string | null;
  try {
    jeton = await inscrire(utilisateur, {
      prenom,
      referentiel,
      niveau,
      serie: champ(donnees, "serie"),
      estMineur,
      contactParent: estMineur ? contactParent : null,
      etablissement: champ(donnees, "etablissement"),
    });
  } catch (erreur) {
    const message = messageErreurMetier(erreur);
    if (message) return { erreur: message };
    throw erreur;
  }

  if (jeton && contactParent) {
    const entetes = await headers();
    const origine = entetes.get("host")
      ? `${entetes.get("x-forwarded-proto") ?? "http"}://${entetes.get("host")}`
      : null;
    const lien = `${urlPublique(origine)}/parent/confirmer?jeton=${encodeURIComponent(jeton)}`;
    await envoyerMessage(
      contactParent,
      `Bonjour, ${prenom} souhaite s'inscrire sur la plateforme de cours en ligne. ` +
        `Pour accepter, ouvrez ce lien : ${lien} . Si vous ne connaissez pas cette demande, ignorez ce message.`,
    );
  }
  redirect("/espace");
}
