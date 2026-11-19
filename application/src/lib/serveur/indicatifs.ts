import "server-only";
import { normaliserTelephone, telephoneAutorise } from "@/lib/identifiants";
import { avecVisiteur } from "./base";
import { simulationAutorisee } from "./configuration";

// Indicatifs téléphoniques autorisés (revue de sécurité D5, ADR 0049) : ceux des packs pays importés. Aucun SMS
// (code de connexion, accord ou rapport du parent) ne part vers un autre pays.

export const MESSAGE_INDICATIF =
  "Ce numéro n'est pas pris en charge : seuls les numéros des pays ouverts sur la plateforme sont acceptés.";

/** Le numéro (déjà normalisé) a-t-il un indicatif autorisé ? */
export async function numeroAccepte(numero: string): Promise<boolean> {
  const indicatifs = await avecVisiteur((client) =>
    client.query("select indicatifs_autorises() as i").then((r) => r.rows[0].i as string[]),
  );
  return telephoneAutorise(numero, indicatifs, simulationAutorisee());
}

/** Contact saisi (numéro ou email) : un email passe toujours ; un numéro doit avoir un indicatif autorisé. */
export async function contactAccepte(saisie: string | null): Promise<boolean> {
  const numero = saisie && !saisie.includes("@") ? normaliserTelephone(saisie) : null;
  return numero === null || numeroAccepte(numero);
}
