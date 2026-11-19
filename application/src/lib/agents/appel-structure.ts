// Appel unique au modèle avec une réponse imposée par schéma JSON (sorties structurées), en flux.
// Partagé par les agents qui produisent un document (quiz, correction) plutôt qu'une conversation.
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { Modele } from "./modele.ts";
import type { ParametresModele } from "./professeur/boucle.ts";

export interface ResultatStructure<T> {
  sortie: T | null;
  arret: "fin" | "refus" | "tronque" | "illisible";
  consommations: BetaMessage["usage"][];
}

export async function appelStructure<T>(entree: {
  systeme: string;
  message: string;
  schema: Record<string, unknown>;
  lire: (brut: string) => T | null;
  modele: Modele;
  parametres: ParametresModele;
  /** Nouvelles tentatives si la sortie est illisible (jamais en cas de refus ou de troncature). */
  tentatives?: number;
  /** Documents PDF joints (en base64, placés avant le texte), lus par le modèle comme des données. */
  documents?: { titre: string; pdfBase64: string }[];
}): Promise<ResultatStructure<T>> {
  const contenu = entree.documents?.length
    ? [
        ...entree.documents.map((d) => ({
          type: "document" as const,
          title: d.titre,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: d.pdfBase64,
          },
        })),
        { type: "text" as const, text: entree.message },
      ]
    : entree.message;
  const consommations: BetaMessage["usage"][] = [];
  for (let essai = 0; essai < (entree.tentatives ?? 2); essai++) {
    const flux = entree.modele({
      model: entree.parametres.modele,
      max_tokens: entree.parametres.maxTokens,
      system: [{ type: "text", text: entree.systeme, cache_control: { type: "ephemeral" } }],
      output_config: {
        effort: entree.parametres.effort,
        format: { type: "json_schema", schema: entree.schema },
      },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: contenu }],
    });
    const message = await flux.message;
    if (message.usage) consommations.push(message.usage);
    if (message.stop_reason === "refusal") return { sortie: null, arret: "refus", consommations };
    if (message.stop_reason === "max_tokens")
      return { sortie: null, arret: "tronque", consommations };
    const texte = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    const sortie = entree.lire(texte);
    if (sortie) return { sortie, arret: "fin", consommations };
  }
  return { sortie: null, arret: "illisible", consommations };
}
