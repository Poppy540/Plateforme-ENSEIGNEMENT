// Services vidéo simulés (développement et tests) : aucun appel externe, aucun coût réel. Les durées et les
// coûts imitent des ordres de grandeur publics (voir docs/fournisseurs-2026-10.md) pour exercer le budget.
// Des pannes peuvent être injectées pour tester les reprises et les escalades.
import type { ServicesVideo } from "./services.ts";

export interface PannesSimulees {
  /** Nombre d'échecs successifs à provoquer sur le service de voix (tous segments confondus). */
  echecsVoix?: number;
  /** Segment dont la transcription est altérée, et nombre de fois (écart de fidélité). */
  transcriptionAlteree?: { segment: number; fois: number };
  /** Multiplicateur du coût réel par rapport à l'estimation (dépassement de budget). */
  multiplicateurCout?: number;
}

const MOTS_PAR_SECONDE = 2.5; // environ 150 mots par minute
const COUT_AVATAR_PAR_MINUTE = 0.99;
const COUT_VOIX_PAR_CARACTERE = 0.00002;

export const dureeParole = (texte: string) =>
  Math.max(1, Math.round(texte.split(/\s+/).filter(Boolean).length / MOTS_PAR_SECONDE));

export function servicesSimules(pannes: PannesSimulees = {}): ServicesVideo {
  let echecsVoix = pannes.echecsVoix ?? 0;
  let alterations = pannes.transcriptionAlteree?.fois ?? 0;
  let compteur = 0;
  const textes = new Map<string, string>();
  const m = pannes.multiplicateurCout ?? 1;

  return {
    nom: "simulation",
    estimerSegment: (texte) =>
      texte.length * COUT_VOIX_PAR_CARACTERE + (dureeParole(texte) / 60) * COUT_AVATAR_PAR_MINUTE,
    async voix(segment, texte) {
      if (echecsVoix > 0) {
        echecsVoix--;
        throw new Error("Service de voix indisponible (simulé).");
      }
      const audio = `simulation://audio/${++compteur}`;
      textes.set(audio, texte);
      return {
        segment,
        audio,
        dureeSecondes: dureeParole(texte),
        coutUSD: texte.length * COUT_VOIX_PAR_CARACTERE * m,
      };
    },
    async avatar(audio) {
      const video = audio.audio.replace("audio", "video");
      textes.set(video, textes.get(audio.audio) ?? "");
      return {
        segment: audio.segment,
        video,
        dureeSecondes: audio.dureeSecondes,
        coutUSD: (audio.dureeSecondes / 60) * COUT_AVATAR_PAR_MINUTE * m,
      };
    },
    async transcrire(video) {
      const texte = textes.get(video.video) ?? "";
      if (pannes.transcriptionAlteree?.segment === video.segment && alterations > 0) {
        alterations--;
        return { texte: `${texte} et quelques mots ajoutés par erreur`, coutUSD: 0 };
      }
      return { texte, coutUSD: 0 };
    },
    async deposer(segments) {
      const minutes = segments.reduce((s, x) => s + x.dureeSecondes, 0) / 60;
      return {
        reference: `simulation://stream/${Date.now().toString(36)}${compteur}`,
        versions: [
          { qualite: "240p", debitKbps: 250 },
          { qualite: "360p", debitKbps: 500 },
          { qualite: "720p", debitKbps: 1500 },
        ],
        coutUSD: minutes * 0.005 * m,
      };
    },
  };
}
