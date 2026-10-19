"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { normaliserEmail, normaliserTelephone } from "@/lib/identifiants";
import { urlPublique } from "@/lib/serveur/configuration";
import { envoyerMessage } from "@/lib/serveur/messagerie";
import { avecServiceMessagerie } from "@/lib/serveur/base";
import {
  aUnProfil,
  inscrire,
  messageErreurMetier,
  optionsInscription,
} from "@/lib/serveur/requetes";
import { exigerAccesEleves } from "@/lib/serveur/disponibilite";
import { utilisateurConnecte } from "@/lib/serveur/session";

export type EtatInscription =
  | { erreur?: string; valeurs?: { prenom: string; contactParent: string; etablissement: string } }
  | undefined;

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
  await exigerAccesEleves();

  const prenom = champ(donnees, "prenom");
  const referentiel = champ(donnees, "referentiel");
  const niveau = champ(donnees, "niveau");
  if (!prenom || prenom.length > 40)
    return { erreur: "Indique ton prénom ou un pseudonyme (40 caractères au plus)." };
  if (!referentiel || !niveau) return { erreur: "Choisis ta classe." };

  // « majeur » n'est proposé que si l'âge de la majorité du pays est connu ; sinon l'élève est traité comme mineur.
  // Le formulaire n'est pas cru sur parole : l'âge vient du référentiel (et la base le vérifie aussi).
  const ageMajorite =
    (await optionsInscription()).referentiels.find((r) => r.code === referentiel)?.ageMajorite ??
    null;
  const estMineur = ageMajorite === null || champ(donnees, "majeur") !== "oui";
  const saisieParent = champ(donnees, "contact_parent");
  const contactParent = saisieParent
    ? (normaliserTelephone(saisieParent) ?? normaliserEmail(saisieParent))
    : null;
  if (estMineur && !contactParent) {
    return {
      erreur:
        "Indique le numéro (format international, avec l’indicatif du pays) ou l'email d'un parent ou tuteur.",
    };
  }

  let demande: string | null;
  try {
    demande = await inscrire(utilisateur, {
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

  if (demande) {
    // Le jeton n'est émis que par le service de messagerie, qui l'envoie au parent (jamais à l'élève).
    const { contact, jeton } = await avecServiceMessagerie((client) =>
      client
        .query("select * from emettre_jeton_consentement($1)", [demande])
        .then((r) => r.rows[0] as { contact: string; jeton: string }),
    );
    const entetes = await headers();
    const origine = entetes.get("host")
      ? `${entetes.get("x-forwarded-proto") ?? "http"}://${entetes.get("host")}`
      : null;
    const lien = `${urlPublique(origine)}/parent/confirmer?jeton=${encodeURIComponent(jeton)}`;
    await envoyerMessage(
      contact,
      `Bonjour, ${prenom} souhaite s'inscrire sur la plateforme de cours en ligne. ` +
        `Pour accepter, ouvrez ce lien : ${lien} . Si vous ne connaissez pas cette demande, ignorez ce message.`,
    );
  }
  redirect("/espace");
}
