// Accès au modèle de langage pour les agents. Deux implémentations :
//   - « anthropic » : API Claude (clé lue dans ANTHROPIC_API_KEY par le SDK, jamais journalisée) ;
//   - « simulation » : réponses scriptées pour le développement et les tests (aucun appel, aucun coût).
import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessage,
  BetaMessageStreamParams,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";

export interface FluxReponse {
  /** Morceaux de texte au fil de la génération. */
  textes: AsyncIterable<string>;
  /** Message complet (contenu, raison d'arrêt, consommation). */
  message: Promise<BetaMessage>;
}

export type Modele = (parametres: BetaMessageStreamParams) => FluxReponse;

let client: Anthropic | undefined;

export const modeleAnthropic: Modele = (parametres) => {
  client ??= new Anthropic();
  const flux = client.beta.messages.stream(parametres);
  async function* textes() {
    for await (const evenement of flux) {
      if (evenement.type === "content_block_delta" && evenement.delta.type === "text_delta") {
        yield evenement.delta.text;
      }
    }
  }
  return { textes: textes(), message: flux.finalMessage() };
};
