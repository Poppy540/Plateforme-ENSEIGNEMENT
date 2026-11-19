import "server-only";
import { dossierPack, racineDepot } from "@/lib/agents/chargeur-prompt";
import { lireSortie } from "@/lib/agents/scenariste/script";
import { ErreurFiche, lireFicheAvatar } from "@/lib/production-video/fiche";
import { produireVideo, type RapportProduction } from "@/lib/production-video/chaine";
import type { FicheAvatar, ServicesVideo } from "@/lib/production-video/services";
import { servicesReels } from "@/lib/production-video/fournisseurs";
import { SOUS_DOMAINE_STREAM } from "@/lib/production-video/lecture";
import { servicesSimules } from "@/lib/production-video/simulation";
import { avecAgentProductionVideo, avecUtilisateur } from "./base";
import { simulationAutorisee } from "./configuration";

// Lancement de la chaîne de production vidéo par un enseignant-référent (ADR 0025) : contrôle d'accès,
// fiche de l'avatar (pack pays), services et budget, puis enregistrement sous le rôle agent_production_video
// (vidéo « à relire » imposée par la base, journal des coûts, alertes). Aucune publication ici.

const UUID = /^[0-9a-f-]{36}$/;

function lire(nom: string): string {
  const v = process.env[nom]?.trim();
  if (!v) throw new ErreurProduction(`Production vidéo : ${nom} manquante.`);
  return v;
}

/**
 * Services vidéo (MODE_VIDEO) : « simulation » en développement et test ; « reel » = passerelle d'avatar et
 * Cloudflare Stream (ADR 0055), une fois les fournisseurs choisis par le propriétaire ; « aucun » par défaut.
 */
export function servicesVideo(): ServicesVideo {
  const mode = process.env.MODE_VIDEO ?? "aucun";
  if (mode === "simulation") {
    if (!simulationAutorisee())
      throw new Error("MODE_VIDEO=simulation est interdit hors développement et test.");
    return servicesSimules();
  }
  if (mode === "reel") {
    const url = lire("AVATAR_HTTP_URL");
    const coutMinuteUSD = Number(lire("AVATAR_COUT_MINUTE_USD"));
    if (!url.startsWith("https://"))
      throw new ErreurProduction("AVATAR_HTTP_URL doit être une adresse https.");
    if (!Number.isFinite(coutMinuteUSD) || coutMinuteUSD <= 0)
      throw new ErreurProduction("AVATAR_COUT_MINUTE_USD invalide.");
    return servicesReels(
      { url, jeton: lire("AVATAR_HTTP_JETON"), coutMinuteUSD },
      { compte: lire("CLOUDFLARE_COMPTE"), jeton: lire("CLOUDFLARE_JETON_STREAM") },
    );
  }
  throw new ErreurProduction(
    "Aucun fournisseur vidéo n'est encore choisi : la production réelle n'est pas disponible.",
  );
}

/** Sous-domaine de lecture Stream (« customer-<code>.cloudflarestream.com »), ou null s'il n'est pas configuré. */
export function sousDomaineStream(): string | null {
  const v = process.env.STREAM_SOUS_DOMAINE?.trim() ?? "";
  return SOUS_DOMAINE_STREAM.test(v) ? v : null;
}

/** Budget par vidéo (USD) : fixé par le propriétaire ; en simulation seulement, une valeur par défaut. */
export function budgetVideo(): number {
  const valeur = Number(process.env.BUDGET_VIDEO_USD);
  if (Number.isFinite(valeur) && valeur > 0) return valeur;
  if ((process.env.MODE_VIDEO ?? "") === "simulation") return 15;
  throw new ErreurProduction("Budget par vidéo non défini (BUDGET_VIDEO_USD).");
}

export class ErreurProduction extends Error {}

export function ficheAvatar(codePays: string, unite: string): FicheAvatar {
  try {
    return lireFicheAvatar(dossierPack(racineDepot(), codePays), unite);
  } catch (erreur) {
    if (erreur instanceof ErreurFiche) throw new ErreurProduction(erreur.message);
    throw erreur;
  }
}

export interface ScriptAProduire {
  scriptId: string;
  version: number;
  empreinte: string;
  chapitreId: string;
  unite: string;
  codePays: string;
}

/** Script de la famille du référent, avec ce qu'il faut pour le produire (null s'il n'y a pas accès). */
export async function scriptAProduire(
  referent: string,
  demande: { scriptId: string; version: number; empreinte: string },
): Promise<ScriptAProduire | null> {
  if (!UUID.test(demande.scriptId)) return null;
  const script = await avecUtilisateur(referent, async (client) => {
    const { rows } = await client.query(
      `select s.id, s.chapitre_id, u.code as unite, r.pays_code
       from scripts s join chapitres c on c.id = s.chapitre_id join unites u on u.id = c.unite_id
       join referentiels r on r.id = u.referentiel_id
       where s.id = $1 and est_referent_du_chapitre(s.chapitre_id)`,
      [demande.scriptId],
    );
    return rows[0] as
      { id: string; chapitre_id: string; unite: string; pays_code: string } | undefined;
  });
  return script
    ? {
        scriptId: script.id,
        version: demande.version,
        empreinte: demande.empreinte,
        chapitreId: script.chapitre_id,
        unite: script.unite,
        codePays: script.pays_code,
      }
    : null;
}

export type ResultatProductionVideo =
  { ok: true; rapport: RapportProduction } | { ok: false; erreur: string };

/**
 * Exécute la chaîne de production pour une tâche vérifiée par l'Orchestrateur, puis enregistre la vidéo
 * « à relire », le journal des coûts et les alertes. Appelée par la file de tâches, jamais directement.
 */
export async function executerProduction(
  script: ScriptAProduire,
): Promise<ResultatProductionVideo> {
  let services: ServicesVideo, budget: number, fiche: FicheAvatar;
  try {
    services = servicesVideo();
    budget = budgetVideo();
    fiche = ficheAvatar(script.codePays, script.unite);
  } catch (erreur) {
    if (erreur instanceof ErreurProduction) return { ok: false, erreur: erreur.message };
    throw erreur;
  }

  const etat = await avecAgentProductionVideo((client) =>
    client
      .query("select * from script_pour_production($1)", [script.scriptId])
      .then((r) => r.rows[0]),
  );
  const contenu = etat && lireSortie(JSON.stringify(etat.contenu));
  if (!etat || !contenu) return { ok: false, erreur: "Script illisible." };

  const rapport = await produireVideo({
    script: {
      id: script.scriptId,
      statut: etat.statut,
      version: etat.version,
      empreinte: etat.empreinte,
      empreinteRecalculee: etat.empreinte_recalculee,
      versionValidee: etat.version_validee,
      empreinteValidee: etat.empreinte_validee,
      dureeCibleMinutes: etat.duree_cible_minutes,
      contenu,
    },
    versionDemandee: script.version,
    empreinteDemandee: script.empreinte,
    fiche,
    budgetUSD: budget,
    services,
    autorisationActive: (id, usage) =>
      avecAgentProductionVideo((client) =>
        client
          .query("select autorisation_active($1, $2) as ok", [id, usage])
          .then((r) => r.rows[0].ok as boolean),
      ),
  });

  // Enregistrement : vidéo « à relire » (si déposée), journal des coûts, alertes pour un humain.
  await avecAgentProductionVideo(async (client) => {
    let videoId: string | null = null;
    if (rapport.resultat === "deposee" && rapport.fichiers) {
      const { rows } = await client.query(
        `insert into videos (script_id, script_version, script_empreinte, reference_hebergement,
           duree_secondes, cout_usd, rapport)
         values ($1, $2, $3, $4, $5, $6, $7) returning id`,
        [
          script.scriptId,
          rapport.script.version,
          rapport.script.empreinte,
          rapport.fichiers.reference,
          Math.max(1, Math.round(rapport.dureeSecondes)),
          rapport.coutUSD,
          rapport,
        ],
      );
      videoId = rows[0].id;
    }
    // Une production refusée avant toute dépense est aussi consignée (traçabilité des tentatives).
    await client.query(
      `insert into journal_production_video (script_id, script_version, resultat, video_id, cout_usd, rapport)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        script.scriptId,
        rapport.script.version,
        rapport.resultat,
        videoId,
        rapport.coutUSD,
        rapport,
      ],
    );
    for (const escalade of rapport.escalades) {
      await client.query(
        `insert into signalements (source, motif, priorite, chapitre_id, resume)
         values ('agent_production_video', 'autre', 2, $1, $2)`,
        [script.chapitreId, `Production vidéo : ${escalade}`.slice(0, 2000)],
      );
    }
  });
  return { ok: true, rapport };
}

export interface ProductionResume {
  creeLe: string;
  resultat: "deposee" | "arretee" | "refusee";
  coutUSD: number;
  videoId: string | null;
  scriptVersion: number;
  anomalies: string[];
  escalades: string[];
  dureeSecondes: number;
}

/** Productions d'un script (journal), pour le référent de la famille. */
export function productionsDuScript(
  referent: string,
  scriptId: string,
): Promise<ProductionResume[]> {
  return avecUtilisateur(referent, async (client) => {
    const { rows } = await client.query(
      `select cree_le as "creeLe", resultat, cout_usd::float as "coutUSD", video_id as "videoId",
         script_version as "scriptVersion", rapport
       from journal_production_video where script_id = $1 order by cree_le desc`,
      [scriptId],
    );
    return rows.map((r) => ({
      creeLe: r.creeLe,
      resultat: r.resultat,
      coutUSD: r.coutUSD,
      videoId: r.videoId,
      scriptVersion: r.scriptVersion,
      anomalies: r.rapport.anomalies ?? [],
      escalades: r.rapport.escalades ?? [],
      dureeSecondes: r.rapport.dureeSecondes ?? 0,
    }));
  });
}
