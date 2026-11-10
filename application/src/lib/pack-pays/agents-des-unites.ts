import { existsSync } from "node:fs";
import { join } from "node:path";
import type { PackPays } from "./lecture";

// Une unité qui a un programme doit avoir les réglages de ses agents (Jalon 22, étape 2 ; ADR 0112) : sans eux, le
// référent qui demande un quiz ou un script tombe sur une erreur du serveur. Contrôlé avant tout import.

/** Agents réglés unité par unité (`agents/<agent>/<unité>.yaml` du pack). */
export const AGENTS_PAR_UNITE = [
  "professeur",
  "scenariste",
  "evaluateur",
  "production-video",
] as const;

/** Fichiers de réglages manquants, relatifs au dossier du pack (vide : complet). */
export function reglagesAgentsManquants(dossier: string, pack: PackPays): string[] {
  return Object.keys(pack.programmes).flatMap((unite) =>
    AGENTS_PAR_UNITE.filter(
      (agent) => !existsSync(join(dossier, "agents", agent, `${unite}.yaml`)),
    ).map((agent) => `agents/${agent}/${unite}.yaml`),
  );
}
