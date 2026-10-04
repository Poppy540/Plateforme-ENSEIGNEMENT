// Boucle de conversation de l'agent Professeur (boucle manuelle avec flux, sans dépendance bêta d'outil).
import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessage,
  BetaMessageParam,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { Modele } from "../modele";
import { OUTILS_PROFESSEUR, validerAppel, type AppelOutil } from "./outils";

export interface ParametresModele {
  modele: string;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens: number;
}

export interface EntreeBoucle {
  systeme: string;
  /** Contexte de la session (chapitre en cours), placé après le prompt mis en cache. */
  contexteSession: string;
  historique: BetaMessageParam[];
  question: string;
  modele: Modele;
  parametres: ParametresModele;
  executerOutil: (appel: AppelOutil) => Promise<string>;
  emettre: (texte: string) => void;
  maxIterations?: number;
}

export interface SortieBoucle {
  texte: string;
  arret: "fin" | "refus" | "limite" | "tronque";
  appels: AppelOutil[];
}

const MESSAGE_REFUS = "Je ne peux pas répondre à cette demande. Revenons au chapitre en cours.";

export async function repondre(entree: EntreeBoucle): Promise<SortieBoucle> {
  const messages: BetaMessageParam[] = [
    ...entree.historique,
    { role: "user", content: entree.question },
  ];
  const appels: AppelOutil[] = [];
  let texte = "";
  let erreursJson = 0;
  const maxIterations = entree.maxIterations ?? 4;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const flux = entree.modele({
      model: entree.parametres.modele,
      max_tokens: entree.parametres.maxTokens,
      // Prompt système stable mis en cache ; le contexte de session (variable) vient après.
      system: [
        { type: "text", text: entree.systeme, cache_control: { type: "ephemeral" } },
        { type: "text", text: entree.contexteSession },
      ],
      output_config: { effort: entree.parametres.effort },
      // Repli côté serveur si le modèle refuse pour une raison de sécurité (routage par catégorie).
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      tools: OUTILS_PROFESSEUR,
      messages,
    });

    let message: BetaMessage;
    try {
      for await (const morceau of flux.textes) {
        texte += morceau;
        entree.emettre(morceau);
      }
      message = await flux.message;
      erreursJson = 0;
    } catch (erreur) {
      // Seule une entrée d'outil illisible est relancée ; les erreurs de l'API remontent.
      if (erreur instanceof Anthropic.APIError || erreursJson++ >= 2) throw erreur;
      continue;
    }

    if (message.stop_reason === "refusal") {
      if (!texte) entree.emettre(MESSAGE_REFUS);
      return { texte: texte || MESSAGE_REFUS, arret: "refus", appels };
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }

    const blocsOutils = message.content.filter((b): b is BetaToolUseBlock => b.type === "tool_use");
    if (blocsOutils.length === 0) {
      return { texte, arret: message.stop_reason === "max_tokens" ? "tronque" : "fin", appels };
    }
    // Une entrée d'outil coupée par max_tokens peut sembler valide : on ne l'exécute pas.
    if (message.stop_reason === "max_tokens") return { texte, arret: "tronque", appels };

    messages.push({ role: "assistant", content: message.content });
    const resultats: BetaToolResultBlockParam[] = [];
    for (const bloc of blocsOutils) {
      const appel = validerAppel(bloc.name, bloc.input);
      if (!appel) {
        resultats.push({
          type: "tool_result",
          tool_use_id: bloc.id,
          is_error: true,
          content: "Entrée invalide : respecte exactement le schéma de l'outil.",
        });
        continue;
      }
      appels.push(appel);
      try {
        resultats.push({
          type: "tool_result",
          tool_use_id: bloc.id,
          content: await entree.executerOutil(appel),
        });
      } catch {
        resultats.push({
          type: "tool_result",
          tool_use_id: bloc.id,
          is_error: true,
          content: "L'outil a échoué.",
        });
      }
    }
    messages.push({ role: "user", content: resultats });
    if (texte && !texte.endsWith("\n")) {
      texte += "\n\n";
      entree.emettre("\n\n");
    }
  }
  return { texte, arret: "limite", appels };
}
