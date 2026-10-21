import type { EvenementVisionnage } from "@/lib/exploitation/mesures";

/** Signale un événement de lecture au compteur agrégé (ADR 0052) ; sans réseau, rien n'est gardé ni réessayé. */
export function signalerLecture(chapitre: string, evenement: EvenementVisionnage): void {
  void fetch("/api/mesures/visionnage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chapitre, evenement }),
    keepalive: true,
  }).catch(() => undefined);
}
