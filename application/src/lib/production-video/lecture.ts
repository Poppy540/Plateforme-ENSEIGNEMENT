// Sources de lecture d'une vidéo hébergée, pour un lecteur adapté au faible débit (ADR 0026) :
// versions triées par débit croissant, la plus légère par défaut. Vidéos simulées (développement) et vidéos
// Cloudflare Stream (ADR 0055) : HLS adaptatif plafonné au débit de la version choisie, MP4 en secours.
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

const STREAM = /^cloudflare-stream:\/\/([0-9a-f]{32})$/;
/** Sous-domaine de lecture propre au compte Stream (« customer-<code>.cloudflarestream.com »). */
export const SOUS_DOMAINE_STREAM = /^customer-[a-z0-9]+\.cloudflarestream\.com$/;

/**
 * Sources lisibles, de la plus légère à la plus lourde ; null si l'hébergeur n'est pas pris en charge (ou, pour
 * Stream, si le sous-domaine de lecture n'est pas configuré).
 */
export function sourcesLecture(
  reference: string,
  versions: VersionHebergee[],
  options: { sousDomaineStream?: string | null } = {},
): SourceLecture[] | null {
  const triees = [...versions].sort((a, b) => a.debitKbps - b.debitKbps);
  if (estSimulee(reference))
    return triees.map((v) => ({
      qualite: v.qualite,
      debitKbps: v.debitKbps,
      fichiers: FICHIERS_SIMULES,
    }));
  const uid = STREAM.exec(reference)?.[1];
  const domaine = options.sousDomaineStream;
  if (!uid || !domaine || !SOUS_DOMAINE_STREAM.test(domaine)) return null;
  return triees.map((v) => ({
    qualite: v.qualite,
    debitKbps: v.debitKbps,
    fichiers: [
      {
        // Plafond de débit indiqué au lecteur (Mbit/s) : la version « économie de données » reste légère.
        url: `https://${domaine}/${uid}/manifest/video.m3u8?clientBandwidthHint=${v.debitKbps / 1000}`,
        type: "application/x-mpegURL",
      },
      { url: `https://${domaine}/${uid}/downloads/default.mp4`, type: "video/mp4" },
    ],
  }));
}

/** Mégaoctets consommés par minute de vidéo à ce débit (information affichée à l'élève). */
export function megaOctetsParMinute(debitKbps: number): number {
  return Math.round(((debitKbps * 60) / 8 / 1000) * 10) / 10;
}
