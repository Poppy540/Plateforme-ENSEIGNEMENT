// Fournisseurs vidéo réels, prêts à brancher (Jalon 7, étape 2 ; ADR 0055). Rien n'est souscrit : chaque adaptateur
// suit un format public (Cloudflare Stream) ou un contrat écrit ici (passerelle d'avatar), à revérifier au
// branchement. La configuration (secrets compris) vient de l'appelant ; les erreurs ne portent qu'une étape, un
// code HTTP et une catégorie, jamais un jeton, un texte de script ni une adresse signée.
//
// Passerelle d'avatar (HTTPS, « Authorization: Bearer <jeton> ») — contrat attendu d'un fournisseur d'avatar ou
// d'un petit service qui l'enveloppe :
//   POST {url}/videos         {texte, avatar, voix, langue, indications}  → {id}
//   GET  {url}/videos/{id}                                                → {statut: en_cours|pret|echec, url, duree_secondes, cout_usd}
//   POST {url}/transcriptions {url_video, langue}                         → {texte, cout_usd}
//   POST {url}/assemblages    {videos: [url, …]}                          → {id}
//   GET  {url}/assemblages/{id}                                           → {statut, url, duree_secondes, cout_usd}
// Hébergement : Cloudflare Stream (stack validée, ADR 0011), copie depuis l'adresse de la vidéo assemblée, lecture
// HLS adaptative (plafond de débit choisi par l'élève) et MP4 de secours.
import { dureeParole } from "./simulation.ts";
import type {
  FicheAvatar,
  ResultatAvatar,
  ResultatDepot,
  ResultatVoix,
  ServicesVideo,
  VersionHebergee,
} from "./services.ts";

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export interface ConfigurationAvatar {
  /** Adresse de la passerelle (https). */
  url: string;
  jeton: string;
  /** Tarif annoncé par le fournisseur, pour estimer le coût avant toute dépense (contrôle du budget). */
  coutMinuteUSD: number;
}

export interface ConfigurationStream {
  compte: string;
  jeton: string;
}

export interface OptionsAttente {
  /** Délai entre deux interrogations d'une tâche (ms). */
  intervalleMs: number;
  /** Nombre d'interrogations avant d'abandonner. */
  essaisMax: number;
  attendre: (ms: number) => Promise<void>;
}

const ATTENTE_PAR_DEFAUT: OptionsAttente = {
  intervalleMs: 5_000,
  essaisMax: 180, // 15 minutes
  attendre: (ms) => new Promise((r) => setTimeout(r, ms)),
};

const DELAI_REQUETE_MS = 30_000;

/** Versions annoncées pour une vidéo hébergée sur Stream : plafond de débit côté lecteur (HLS adaptatif). */
export const VERSIONS_STREAM: VersionHebergee[] = [
  { qualite: "Économie de données", debitKbps: 300 },
  { qualite: "Automatique", debitKbps: 1500 },
];

/** Stockage Stream : environ 5 USD pour 1 000 minutes par mois (docs/fournisseurs-2026-10.md). */
const COUT_STOCKAGE_MINUTE_USD = 0.005;

export type CategorieErreur = "configuration" | "temporaire" | "refuse" | "delai";

/** Erreur d'un fournisseur vidéo, sans secret ni contenu : l'étape, le code HTTP éventuel, la catégorie. */
export class ErreurFournisseurVideo extends Error {
  constructor(
    readonly etape: string,
    readonly categorie: CategorieErreur,
    readonly statut: number | null = null,
  ) {
    super(`${etape} : ${categorie}${statut ? ` (HTTP ${statut})` : ""}`);
    this.name = "ErreurFournisseurVideo";
  }
}

function categorie(statut: number): CategorieErreur {
  if (statut === 401 || statut === 403) return "configuration";
  if (statut === 429 || statut >= 500) return "temporaire";
  return "refuse";
}

async function appelerJson(
  fetchFn: Fetch,
  etape: string,
  url: string,
  init: RequestInit,
): Promise<Record<string, unknown>> {
  let reponse: Response;
  try {
    reponse = await fetchFn(url, { ...init, signal: AbortSignal.timeout(DELAI_REQUETE_MS) });
  } catch {
    throw new ErreurFournisseurVideo(etape, "temporaire");
  }
  if (!reponse.ok)
    throw new ErreurFournisseurVideo(etape, categorie(reponse.status), reponse.status);
  const corps = (await reponse.json().catch(() => null)) as Record<string, unknown> | null;
  if (!corps) throw new ErreurFournisseurVideo(etape, "refuse", reponse.status);
  return corps;
}

const nombre = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
const httpsOuErreur = (etape: string, v: unknown): string => {
  if (typeof v === "string" && v.startsWith("https://")) return v;
  throw new ErreurFournisseurVideo(etape, "refuse");
};

/** Interroge une tâche jusqu'à « pret » ; « echec » ou dépassement du délai arrêtent. */
async function attendreTache(
  etape: string,
  lire: () => Promise<Record<string, unknown>>,
  attente: OptionsAttente,
): Promise<Record<string, unknown>> {
  for (let essai = 0; essai < attente.essaisMax; essai++) {
    const etat = await lire();
    if (etat.statut === "pret") return etat;
    if (etat.statut === "echec") throw new ErreurFournisseurVideo(etape, "refuse");
    await attente.attendre(attente.intervalleMs);
  }
  throw new ErreurFournisseurVideo(etape, "delai");
}

/**
 * Services vidéo réels : passerelle d'avatar (voix et visage de synthèse, transcription, assemblage) et
 * Cloudflare Stream (hébergement). Les règles de la chaîne (script validé, budget, fidélité, aucune personne réelle
 * sans autorisation) restent appliquées par `produireVideo`.
 */
export function servicesReels(
  avatar: ConfigurationAvatar,
  stream: ConfigurationStream,
  fetchFn: Fetch = fetch,
  attente: OptionsAttente = ATTENTE_PAR_DEFAUT,
): ServicesVideo {
  const base = avatar.url.replace(/\/$/, "");
  const entetes = {
    authorization: `Bearer ${avatar.jeton}`,
    "content-type": "application/json",
  };
  const cf = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(stream.compte)}/stream`;
  const entetesCf = {
    authorization: `Bearer ${stream.jeton}`,
    "content-type": "application/json",
  };
  // La voix est produite par le fournisseur d'avatar avec la vidéo : l'étape « voix » garde seulement le texte.
  const textes = new Map<string, string>();
  let compteur = 0;

  return {
    nom: "avatar-http+cloudflare-stream",
    estimerSegment: (texte) => (dureeParole(texte) / 60) * avatar.coutMinuteUSD,

    async voix(segment, texte): Promise<ResultatVoix> {
      const audio = `texte://${++compteur}`;
      textes.set(audio, texte);
      return { segment, audio, dureeSecondes: dureeParole(texte), coutUSD: 0 };
    },

    async avatar(audio, fiche: FicheAvatar, indications): Promise<ResultatAvatar> {
      const tache = await appelerJson(fetchFn, "avatar", `${base}/videos`, {
        method: "POST",
        headers: entetes,
        body: JSON.stringify({
          texte: textes.get(audio.audio) ?? "",
          avatar: fiche.avatar,
          voix: fiche.voix,
          langue: fiche.langue,
          indications,
        }),
      });
      if (typeof tache.id !== "string") throw new ErreurFournisseurVideo("avatar", "refuse");
      const id = encodeURIComponent(tache.id);
      const pret = await attendreTache(
        "avatar",
        () => appelerJson(fetchFn, "avatar", `${base}/videos/${id}`, { headers: entetes }),
        attente,
      );
      return {
        segment: audio.segment,
        video: httpsOuErreur("avatar", pret.url),
        dureeSecondes: nombre(pret.duree_secondes) || audio.dureeSecondes,
        coutUSD: nombre(pret.cout_usd),
      };
    },

    async transcrire(video) {
      const r = await appelerJson(fetchFn, "transcription", `${base}/transcriptions`, {
        method: "POST",
        headers: entetes,
        body: JSON.stringify({ url_video: video.video, langue: "fr" }),
      });
      if (typeof r.texte !== "string") throw new ErreurFournisseurVideo("transcription", "refuse");
      return { texte: r.texte, coutUSD: nombre(r.cout_usd) };
    },

    async deposer(segments): Promise<ResultatDepot> {
      // 1. Une seule vidéo à héberger : assemblage des segments par la passerelle.
      let url = segments[0]?.video;
      let coutUSD = 0;
      if (segments.length > 1) {
        const tache = await appelerJson(fetchFn, "assemblage", `${base}/assemblages`, {
          method: "POST",
          headers: entetes,
          body: JSON.stringify({ videos: segments.map((s) => s.video) }),
        });
        if (typeof tache.id !== "string") throw new ErreurFournisseurVideo("assemblage", "refuse");
        const id = encodeURIComponent(tache.id);
        const pret = await attendreTache(
          "assemblage",
          () =>
            appelerJson(fetchFn, "assemblage", `${base}/assemblages/${id}`, { headers: entetes }),
          attente,
        );
        url = httpsOuErreur("assemblage", pret.url);
        coutUSD += nombre(pret.cout_usd);
      }
      url = httpsOuErreur("assemblage", url);

      // 2. Copie dans Stream depuis l'adresse, puis attente de la préparation (versions adaptatives).
      const copie = await appelerJson(fetchFn, "hebergement", `${cf}/copy`, {
        method: "POST",
        headers: entetesCf,
        body: JSON.stringify({ url, meta: { name: "cours" }, requireSignedURLs: false }),
      });
      const uid = (copie.result as Record<string, unknown> | undefined)?.uid;
      if (copie.success !== true || typeof uid !== "string" || !/^[0-9a-f]{32}$/.test(uid))
        throw new ErreurFournisseurVideo("hebergement", "refuse");
      const pret = await attendreTache(
        "hebergement",
        async () => {
          const r = await appelerJson(fetchFn, "hebergement", `${cf}/${uid}`, {
            headers: entetesCf,
          });
          const v = (r.result ?? {}) as Record<string, unknown>;
          const etat = ((v.status ?? {}) as Record<string, unknown>).state;
          return {
            statut: v.readyToStream === true ? "pret" : etat === "error" ? "echec" : "en_cours",
            duree: v.duration,
          };
        },
        attente,
      );
      // 3. MP4 de secours pour les navigateurs sans HLS (téléchargement progressif, une seule qualité).
      await appelerJson(fetchFn, "hebergement", `${cf}/${uid}/downloads`, {
        method: "POST",
        headers: entetesCf,
      });
      const minutes =
        (nombre(pret.duree) || segments.reduce((s, x) => s + x.dureeSecondes, 0)) / 60;
      return {
        reference: `cloudflare-stream://${uid}`,
        versions: VERSIONS_STREAM,
        coutUSD: coutUSD + minutes * COUT_STOCKAGE_MINUTE_USD,
      };
    },
  };
}
