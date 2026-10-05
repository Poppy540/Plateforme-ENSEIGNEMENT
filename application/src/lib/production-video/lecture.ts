// Sources de lecture d'une vidéo hébergée, pour un lecteur adapté au faible débit (ADR 0026) :
// versions triées par débit croissant, la plus légère par défaut. Seules les vidéos simulées sont lisibles
// tant qu'aucun hébergeur n'est branché.
import type { VersionHebergee } from "./services.ts";

export interface SourceLecture {
  qualite: string;
  debitKbps: number;
  /** Fichiers équivalents, par ordre de préférence ; le navigateur prend le premier qu'il sait lire. */
  fichiers: { url: string; type: string }[];
}

/** Fichiers de démonstration du mode simulation (scripts/generer-video-simulee.sh). */
export const FICHIERS_SIMULES = [
  { url: "/simulation/video-simulee-240p.webm", type: "video/webm" },
  { url: "/simulation/video-simulee-240p.mp4", type: "video/mp4" },
];

export function estSimulee(reference: string): boolean {
  return reference.startsWith("simulation://");
}

/** Sources lisibles, de la plus légère à la plus lourde ; null si l'hébergeur n'est pas pris en charge. */
export function sourcesLecture(
  reference: string,
  versions: VersionHebergee[],
): SourceLecture[] | null {
  if (!estSimulee(reference)) return null;
  const triees = [...versions].sort((a, b) => a.debitKbps - b.debitKbps);
  return triees.map((v) => ({
    qualite: v.qualite,
    debitKbps: v.debitKbps,
    fichiers: FICHIERS_SIMULES,
  }));
}

/** Mégaoctets consommés par minute de vidéo à ce débit (information affichée à l'élève). */
export function megaOctetsParMinute(debitKbps: number): number {
  return Math.round(((debitKbps * 60) / 8 / 1000) * 10) / 10;
}
