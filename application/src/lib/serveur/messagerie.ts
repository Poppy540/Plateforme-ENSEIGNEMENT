import "server-only";
import {
  canalDe,
  fournisseurBrevo,
  fournisseurHttp,
  fournisseurTwilio,
  type Canal,
  type FournisseurMessages,
} from "@/lib/messagerie/fournisseurs";
import { simulationAutorisee } from "./configuration";

// Envoi des messages de la plateforme (accord et rapports aux parents, alerte de veille, recrutement) par les
// canaux approuvés uniquement (ADR 0045). Fournisseur choisi par canal dans l'environnement :
//   FOURNISSEUR_SMS   = simulation | twilio | http
//   FOURNISSEUR_EMAIL = simulation | brevo | http
// « simulation » (par défaut en développement et en test) garde les messages en mémoire et les affiche sur
// /developpement/messages ; il est refusé ailleurs. Les codes de connexion, eux, sont envoyés par Supabase.

export interface MessageSimule {
  destinataire: string;
  texte: string;
  envoyeLe: string;
}

const globalPourMessages = globalThis as unknown as { messagesSimules?: MessageSimule[] };

function lire(nom: string): string {
  const valeur = process.env[nom]?.trim();
  if (!valeur) throw new Error(`Messagerie : ${nom} manquante.`);
  return valeur;
}

/** Fournisseur du canal, ou null pour la simulation. Lève une erreur de configuration (sans valeur secrète). */
export function fournisseurDuCanal(canal: Canal): FournisseurMessages | null {
  const variable = canal === "sms" ? "FOURNISSEUR_SMS" : "FOURNISSEUR_EMAIL";
  const choix = process.env[variable]?.trim() || (simulationAutorisee() ? "simulation" : "");
  if (choix === "simulation") {
    if (!simulationAutorisee())
      throw new Error(`${variable}=simulation est interdit hors simulation.`);
    return null;
  }
  if (canal === "sms" && choix === "twilio")
    return fournisseurTwilio({
      compte: lire("TWILIO_COMPTE"),
      jeton: lire("TWILIO_JETON"),
      expediteur: lire("SMS_EXPEDITEUR"),
    });
  if (canal === "email" && choix === "brevo")
    return fournisseurBrevo({
      cle: lire("BREVO_CLE"),
      expediteur: lire("EMAIL_EXPEDITEUR"),
      nomExpediteur: process.env.EMAIL_NOM_EXPEDITEUR?.trim() || "Plateforme d'enseignement",
    });
  if (choix === "http")
    return fournisseurHttp({
      url: lire("MESSAGERIE_HTTP_URL"),
      jeton: lire("MESSAGERIE_HTTP_JETON"),
      canaux: [canal],
    });
  throw new Error(`${variable} : fournisseur absent ou inconnu pour ce canal.`);
}

/**
 * Envoie un message (SMS pour un numéro, email pour une adresse). Une seule nouvelle tentative après un échec
 * temporaire. En cas d'échec, l'erreur ne contient ni le destinataire ni le texte.
 */
export async function envoyerMessage(
  destinataire: string,
  texte: string,
  objet?: string,
): Promise<void> {
  const canal = canalDe(destinataire);
  const fournisseur = fournisseurDuCanal(canal);
  if (!fournisseur) {
    globalPourMessages.messagesSimules ??= [];
    globalPourMessages.messagesSimules.unshift({
      destinataire,
      texte: objet ? `${objet}\n\n${texte}` : texte,
      envoyeLe: new Date().toISOString(),
    });
    globalPourMessages.messagesSimules.splice(50);
    return;
  }
  const message = { canal, destinataire, texte, objet };
  let resultat = await fournisseur.envoyer(message);
  if (!resultat.ok && resultat.categorie === "temporaire") {
    await new Promise((r) => setTimeout(r, 1000));
    resultat = await fournisseur.envoyer(message);
  }
  if (!resultat.ok)
    throw new Error(
      `Envoi ${canal} impossible par ${fournisseur.nom} (${resultat.categorie}${resultat.statut ? `, ${resultat.statut}` : ""}).`,
    );
}

export function messagesSimules(): MessageSimule[] {
  if (!simulationAutorisee()) return [];
  return globalPourMessages.messagesSimules ?? [];
}
