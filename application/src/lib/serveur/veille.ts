import "server-only";
import { avecServiceMessagerie } from "./base";
import { simulationAutorisee, urlPublique } from "./configuration";
import { envoyerMessage } from "./messagerie";

// Alerte de veille (ADR 0036) : la base inscrit chaque signalement ou ticket de priorité 1 ; ici, le service de
// messagerie prévient l'équipe de veille par un message groupé SANS donnée d'élève (nombre, motifs, lien vers
// l'administration), puis relance tant que l'élément n'est ni traité ni pris en charge.

function entier(nom: string, defaut: number): number {
  const v = Number(process.env[nom]);
  return Number.isInteger(v) && v > 0 ? v : defaut;
}

/** Contacts de l'équipe de veille (variable CONTACTS_VEILLE, séparés par des virgules ; hors du dépôt). */
export function contactsVeille(): string[] {
  return (process.env.CONTACTS_VEILLE ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

const LIBELLES: Record<string, string> = {
  detresse: "détresse",
  autre: "autre",
  erreur_contenu: "erreur de contenu",
  contenu_inapproprie: "contenu inapproprié",
  paiement_suppression: "paiement ou suppression",
  fraude_plainte: "fraude ou plainte",
};

/** Texte de l'alerte : jamais de prénom, d'identifiant, de contact ni de résumé (seulement motifs et nombre). */
export function texteAlerte(
  alertes: { motif: string; envois: number }[],
  adresseAdministration: string,
): string {
  const motifs = [...new Set(alertes.map((a) => LIBELLES[a.motif] ?? a.motif))].join(", ");
  const relance = alertes.some((a) => a.envois > 1);
  return [
    `${relance ? "RELANCE — " : ""}Plateforme : ${alertes.length} élément(s) de priorité 1 à traiter (${motifs}).`,
    relance ? "Au moins un élément n'est toujours pas pris en charge." : "",
    `Suivez la procédure de détresse et ouvrez la file humaine : ${adresseAdministration}`,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Envoie les alertes dues (premiers envois et relances). Renvoie le nombre d'alertes signalées. */
export async function alerterVeille(): Promise<number> {
  const alertes = await avecServiceMessagerie((client) =>
    client
      .query("select motif, envois from alertes_veille_a_envoyer($1, $2)", [
        entier("ALERTE_RELANCE_MINUTES", 120),
        entier("ALERTE_RELANCES_MAX", 3),
      ])
      .then((r) => r.rows as { motif: string; envois: number }[]),
  );
  if (alertes.length === 0) return 0;
  const contacts = contactsVeille();
  if (contacts.length === 0) {
    // Les alertes restent visibles dans /administration ; l'absence de contacts est une erreur de configuration.
    console.error("Alerte de veille : aucun contact configuré (CONTACTS_VEILLE).");
    return 0;
  }
  let adresse = "/administration";
  try {
    adresse = `${urlPublique(null)}/administration`;
  } catch {
    if (!simulationAutorisee()) throw new Error("URL_PUBLIQUE manquante.");
  }
  const texte = texteAlerte(alertes, adresse);
  for (const contact of contacts) await envoyerMessage(contact, texte);
  return alertes.length;
}

/**
 * Après la création d'un signalement : tente l'envoi tout de suite, sans jamais faire échouer la demande
 * de l'élève (l'exécuteur planifié réessaie et relance).
 */
export async function alerterVeilleSansAttendre(): Promise<void> {
  try {
    await alerterVeille();
  } catch (erreur) {
    console.error(`Alerte de veille : envoi impossible (${(erreur as Error).name}).`);
  }
}
