// Outils de l'agent Professeur (ADR 0006, prompt maître §5.2) : enregistrer la progression, signaler à un humain.
// Les entrées viennent du modèle : elles sont validées ici avant toute exécution, et la base vérifie
// en plus le périmètre (rôle agent_professeur limité à l'élève connecté et aux chapitres de son unité).
import type { BetaTool } from "@anthropic-ai/sdk/resources/beta/messages/messages";

export const OUTILS_PROFESSEUR: BetaTool[] = [
  {
    name: "enregistrer_progression",
    description:
      "Enregistre l'avancement de l'élève connecté sur le chapitre en cours : « en_cours » quand il a commencé à travailler le chapitre, « termine » quand il a réussi la mini-vérification de fin de chapitre. N'enregistre jamais une note.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: { statut: { type: "string", enum: ["en_cours", "termine"] } },
      required: ["statut"],
      additionalProperties: false,
    },
  },
  {
    name: "signaler",
    description:
      "Passe la main à un humain (enseignant-référent ou responsable) : détresse, peur ou danger exprimé par l'élève ; question hors programme ou dont tu n'es pas sûr ; erreur ou contenu inapproprié signalé ; demandes répétées de réponses toutes faites. Le résumé est factuel, court, sans donnée personnelle inutile.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        motif: {
          type: "string",
          enum: [
            "detresse",
            "hors_programme",
            "erreur_contenu",
            "demande_reponses",
            "contenu_inapproprie",
            "autre",
          ],
        },
        resume: {
          type: "string",
          description: "Résumé factuel en une ou deux phrases (500 caractères au plus).",
        },
      },
      required: ["motif", "resume"],
      additionalProperties: false,
    },
  },
];

export type AppelOutil =
  | { nom: "enregistrer_progression"; statut: "en_cours" | "termine" }
  | {
      nom: "signaler";
      motif:
        | "detresse"
        | "hors_programme"
        | "erreur_contenu"
        | "demande_reponses"
        | "contenu_inapproprie"
        | "autre";
      resume: string;
    };

const MOTIFS = [
  "detresse",
  "hors_programme",
  "erreur_contenu",
  "demande_reponses",
  "contenu_inapproprie",
  "autre",
];

/** Valide l'entrée d'un appel d'outil ; null si elle ne respecte pas le schéma. */
export function validerAppel(nom: string, entree: unknown): AppelOutil | null {
  if (typeof entree !== "object" || entree === null) return null;
  const e = entree as Record<string, unknown>;
  if (nom === "enregistrer_progression") {
    if (Object.keys(e).length !== 1) return null;
    return e.statut === "en_cours" || e.statut === "termine" ? { nom, statut: e.statut } : null;
  }
  if (nom === "signaler") {
    if (Object.keys(e).some((k) => k !== "motif" && k !== "resume")) return null;
    if (typeof e.motif !== "string" || !MOTIFS.includes(e.motif)) return null;
    if (typeof e.resume !== "string" || e.resume.trim() === "" || e.resume.length > 500)
      return null;
    return {
      nom,
      motif: e.motif as Extract<AppelOutil, { nom: "signaler" }>["motif"],
      resume: e.resume.trim(),
    };
  }
  return null;
}

/** Priorité d'un signalement : 1 = immédiat (la base force aussi 1 pour la détresse). */
export function prioriteSignalement(motif: string): 1 | 2 | 3 {
  if (motif === "detresse" || motif === "contenu_inapproprie") return 1;
  if (motif === "erreur_contenu") return 2;
  return 3;
}
