import "server-only";
import { lireMessage, parametresMessage, type Message } from "@/lib/message-signe";
import { secretSession } from "./configuration";

/** Paramètres signés pour un message après une action (revue du Jalon 24, S22). */
export function messageSigne(message: Message): Record<string, string> {
  return parametresMessage(message, secretSession());
}

/** Message affichable lu dans l'adresse : rien s'il n'est pas signé par le serveur. */
export function messageDeLAdresse(parametres: Record<string, string | string[] | undefined>) {
  return lireMessage(parametres, secretSession());
}
