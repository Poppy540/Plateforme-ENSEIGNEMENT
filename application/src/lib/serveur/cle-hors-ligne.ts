import "server-only";
import { createHash } from "node:crypto";
import { selAudit } from "./configuration";

/**
 * Clé des copies hors ligne de la personne connectée (ADR 0044) : pseudonyme salé, jamais l'identifiant. Le
 * service worker efface les copies dès que la clé change (autre personne sur le même appareil).
 */
export function cleHorsLigne(utilisateur: string): string {
  return createHash("sha256")
    .update(`hors-ligne:${selAudit()}:${utilisateur}`)
    .digest("hex")
    .slice(0, 24);
}
