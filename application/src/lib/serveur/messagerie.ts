import "server-only";
import { simulationAutorisee } from "./configuration";

// Envoi des messages de la plateforme (par exemple le lien de validation au parent) par les canaux
// approuvés uniquement. Le fournisseur SMS / email n'est pas encore choisi : en développement et en test,
// les messages sont gardés en mémoire et affichés sur /developpement/messages.

export interface MessageSimule {
  destinataire: string;
  texte: string;
  envoyeLe: string;
}

const globalPourMessages = globalThis as unknown as { messagesSimules?: MessageSimule[] };

export async function envoyerMessage(destinataire: string, texte: string): Promise<void> {
  if (simulationAutorisee()) {
    globalPourMessages.messagesSimules ??= [];
    globalPourMessages.messagesSimules.unshift({
      destinataire,
      texte,
      envoyeLe: new Date().toISOString(),
    });
    globalPourMessages.messagesSimules.splice(50);
    return;
  }
  throw new Error("Aucun fournisseur d'envoi de messages n'est configuré.");
}

export function messagesSimules(): MessageSimule[] {
  if (!simulationAutorisee()) return [];
  return globalPourMessages.messagesSimules ?? [];
}
