import "server-only";
import { createHash } from "node:crypto";
import { dossierPack, racineDepot } from "@/lib/agents/chargeur-prompt";
import {
  controlerCout,
  controlerProfondeur,
  router,
  verifierApprobation,
  type ApprobationEnBase,
  type Decision,
  type Demande,
} from "@/lib/orchestrateur/regles";
import { lirePack, type PackPays } from "@/lib/pack-pays/lecture";
import { avecAgentOrchestrateur } from "./base";
import { coutJourMaxUSD, modeFile, selAudit } from "./configuration";
import { executerAnalyse } from "./conformite-execution";
import { executerRevue } from "./coordinateur-execution";
import { executerProduction, type ScriptAProduire } from "./production-video";
import { alerterVeilleSansAttendre } from "./veille";

// Orchestrateur programmé (ADR 0027, 0029) : il reçoit des demandes structurées par le serveur, les route,
// vérifie les approbations dans la base, crée et exécute les tâches, coupe les boucles, suspend un agent au
// coût anormal et alerte un humain. Il ne fait jamais le travail d'un agent et ne lit aucun contenu.

const packs = new Map<string, PackPays>();
function pack(codePays: string): PackPays {
  if (!packs.has(codePays)) packs.set(codePays, lirePack(dossierPack(racineDepot(), codePays)));
  return packs.get(codePays)!;
}

/** Empreinte pseudonyme d'un identifiant pour le journal d'audit (jamais le nom ni l'identifiant en clair). */
export function empreinteActeur(identifiant: string): string {
  return createHash("sha256").update(`${selAudit()}:${identifiant}`).digest("hex").slice(0, 16);
}

async function auditer(
  acteur: { role: string; id?: string },
  action: string,
  objet: { type?: string; id?: string } = {},
  details: Record<string, unknown> = {},
) {
  await avecAgentOrchestrateur((client) =>
    client.query(
      `insert into journal_audit (acteur, acteur_empreinte, action, objet_type, objet_id, details)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        acteur.role,
        acteur.id ? empreinteActeur(acteur.id) : null,
        action,
        objet.type ?? null,
        objet.id ?? null,
        details,
      ],
    ),
  );
}

/** Alerte pour un humain : rejoint la file des signalements (sans donnée d'élève). */
async function alerter(resume: string, priorite: 1 | 2 | 3 = 2) {
  await avecAgentOrchestrateur((client) =>
    client.query(
      `insert into signalements (source, motif, priorite, resume) values ('agent_orchestrateur', 'autre', $1, $2)`,
      [priorite, resume.slice(0, 2000)],
    ),
  );
  if (priorite === 1) await alerterVeilleSansAttendre();
}

async function approbationsEnregistrees(objet: string, id: string): Promise<ApprobationEnBase[]> {
  return avecAgentOrchestrateur(async (client) => {
    const { rows } = await client.query(
      `select id, objet_type, objet_id, version, empreinte, decision, valideur_id, decide_le
       from approbations where objet_type = $1 and objet_id::text = $2`,
      [objet, id],
    );
    return rows.map((r) => ({
      id: r.id,
      objetType: r.objet_type,
      objetId: r.objet_id,
      version: r.version,
      empreinte: r.empreinte,
      decision: r.decision,
      valideur: r.valideur_id,
      decideLe: new Date(r.decide_le).toISOString(),
    }));
  });
}

export type ResultatSoumission =
  | { statut: "refusee"; motif: string }
  | { statut: "question"; question: string }
  | { statut: "en_attente" | "bloquee" | "suspendue"; tacheId: string; motif: string | null };

/**
 * Soumet une demande structurée. Les entrées ajoutées par le serveur (`entreesServeur`) sont des données déjà
 * vérifiées (par exemple l'unité du script, contrôlée avec les droits du demandeur).
 */
export async function soumettre(
  demande: Demande,
  options: {
    acteur: { role: string; id?: string };
    codePays: string;
    demandeePar?: string;
    tacheParente?: string;
    entreesServeur?: Record<string, unknown>;
  },
): Promise<ResultatSoumission> {
  const p = pack(options.codePays);
  const d: Decision = router(demande, {
    unites: p.unites,
    familles: [...new Set(p.matieres.map((m) => m.famille))],
  });

  if (d.refus) {
    await auditer(options.acteur, "refus", { type: d.type }, { motif: d.refus });
    if (d.alerte) await alerter(d.alerte);
    return { statut: "refusee", motif: d.refus };
  }
  if (d.question || !d.agent)
    return { statut: "question", question: d.question ?? "Demande à préciser." };

  // Limite contre les boucles entre agents.
  let profondeur = 0;
  if (options.tacheParente) {
    const parente = await avecAgentOrchestrateur((client) =>
      client.query("select profondeur from taches where id = $1", [options.tacheParente]),
    );
    const controle = controlerProfondeur(parente.rows[0]?.profondeur ?? 0);
    if (!controle.ok) {
      await auditer(options.acteur, "boucle_coupee", { type: "tache", id: options.tacheParente });
      await alerter(controle.alerte);
      return { statut: "refusee", motif: controle.alerte };
    }
    profondeur = controle.profondeur;
  }

  // Validation humaine : vérifiée dans la base, jamais présumée.
  let statut: "en_attente" | "bloquee" | "suspendue" = "en_attente";
  let motif: string | null = null;
  let approbationId: string | null = null;
  if (d.approbationRequise) {
    const v = verifierApprobation(
      d.approbationRequise,
      await approbationsEnregistrees(d.approbationRequise.objet, d.approbationRequise.id),
    );
    if (v.ok) approbationId = v.approbation.id;
    else [statut, motif] = ["bloquee", v.motif];
  }
  if (statut === "en_attente" && d.agent !== "humain") {
    const etat = await avecAgentOrchestrateur((client) =>
      client.query("select suspendu, motif from etat_agents where agent = $1", [d.agent]),
    );
    if (etat.rows[0]?.suspendu)
      [statut, motif] = ["suspendue", `Agent suspendu : ${etat.rows[0].motif ?? ""}`];
  }

  const tacheId = await avecAgentOrchestrateur(async (client) => {
    const { rows } = await client.query(
      `insert into taches (type, agent, entrees, priorite, statut, profondeur, tache_parente, approbation_id,
         motif, demandee_par)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
      [
        d.type,
        d.agent,
        { ...d.entrees, ...options.entreesServeur, approbation_requise: d.approbationRequise },
        d.priorite,
        statut,
        profondeur,
        options.tacheParente ?? null,
        approbationId,
        motif,
        options.demandeePar ?? null,
      ],
    );
    return rows[0].id as string;
  });
  await auditer(
    options.acteur,
    statut === "en_attente" ? "creation_tache" : `tache_${statut}`,
    {
      type: "tache",
      id: tacheId,
    },
    { agent: d.agent, type: d.type, motif },
  );
  if (d.alerte) await alerter(d.alerte, d.priorite);
  if (statut === "bloquee")
    await auditer({ role: "agent_orchestrateur" }, "relance_validation", {
      type: "tache",
      id: tacheId,
    });

  if (statut === "en_attente" && modeFile() === "immediat") await executerFile();
  return { statut, tacheId, motif };
}

// ---------------------------------------------------------------------------------------------------------
// Exécuteur de la file.
// ---------------------------------------------------------------------------------------------------------

type ResultatExecuteur =
  { ok: true; coutUSD: number; resultat: Record<string, unknown> } | { ok: false; erreur: string };

/** Exécuteurs disponibles, par type de tâche (les autres agents seront branchés à leurs étapes). */
const EXECUTEURS: Record<string, (entrees: Record<string, unknown>) => Promise<ResultatExecuteur>> =
  {
    // Revue de cohérence d'une famille (Coordinateur) : référentiel et demandeur ajoutés par le serveur.
    coherence_famille: (entrees) => executerRevue(entrees as Parameters<typeof executerRevue>[0]),
    // Comparaison d'une unité à un document officiel (Conformité) : document et unité ajoutés par le serveur.
    comparaison_programme: (entrees) =>
      executerAnalyse(entrees as Parameters<typeof executerAnalyse>[0]),
    async production_video(entrees) {
      const r = await executerProduction(entrees as unknown as ScriptAProduire);
      if (!r.ok) return { ok: false, erreur: r.erreur };
      return {
        ok: true,
        coutUSD: r.rapport.coutUSD,
        resultat: {
          resultat: r.rapport.resultat,
          dureeSecondes: r.rapport.dureeSecondes,
          coutUSD: r.rapport.coutUSD,
          derniereAnomalie: r.rapport.anomalies.at(-1) ?? null,
        },
      };
    },
  };

interface TachePrise {
  id: string;
  type: string;
  agent: string;
  entrees: Record<string, unknown> & { approbation_requise?: Decision["approbationRequise"] };
  tentatives: number;
  tentatives_max: number;
}

/** Traite au plus `max` tâches, par priorité puis ancienneté ; renvoie les identifiants traités. */
export async function executerFile(max = 5): Promise<string[]> {
  const traitees: string[] = [];
  for (let i = 0; i < max; i++) {
    const tache = await avecAgentOrchestrateur(async (client) => {
      const { rows } = await client.query(
        `update taches set statut = 'en_cours', tentatives = tentatives + 1, debut_le = now()
         where id = (
           select t.id from taches t join etat_agents e on e.agent = t.agent
           where t.statut = 'en_attente' and not e.suspendu and t.type = any($1)
           order by t.priorite, t.cree_le
           for update of t skip locked limit 1
         )
         returning id, type, agent, entrees, tentatives, tentatives_max`,
        [Object.keys(EXECUTEURS)],
      );
      return rows[0] as TachePrise | undefined;
    });
    if (!tache) break;
    traitees.push(tache.id);

    // Revérifier l'approbation au moment d'exécuter (elle a pu changer depuis la demande).
    let resultat: ResultatExecuteur;
    const exigee = tache.entrees.approbation_requise;
    const v = exigee
      ? verifierApprobation(exigee, await approbationsEnregistrees(exigee.objet, exigee.id))
      : null;
    if (v && !v.ok) {
      await avecAgentOrchestrateur((client) =>
        client.query(
          "update taches set statut = 'bloquee', motif = $2, fin_le = now() where id = $1",
          [tache.id, v.motif],
        ),
      );
      continue;
    }
    try {
      resultat = await EXECUTEURS[tache.type](tache.entrees);
    } catch (erreur) {
      resultat = { ok: false, erreur: `Erreur d'exécution (${(erreur as Error).name})` };
    }

    if (resultat.ok) {
      await avecAgentOrchestrateur((client) =>
        client.query(
          `update taches set statut = 'terminee', cout_usd = cout_usd + $2, resultat = $3, fin_le = now(), motif = null
           where id = $1`,
          [tache.id, resultat.coutUSD, resultat.resultat],
        ),
      );
    } else {
      const derniere = tache.tentatives >= tache.tentatives_max;
      await avecAgentOrchestrateur((client) =>
        client.query(
          "update taches set statut = $2, motif = $3, fin_le = case when $4 then now() end where id = $1",
          [tache.id, derniere ? "echouee" : "en_attente", resultat.erreur, derniere],
        ),
      );
      if (derniere)
        await alerter(
          `Échec répété de l'agent ${tache.agent} (tâche ${tache.type}, ${tache.tentatives} tentatives) : ${resultat.erreur}`,
        );
    }

    // Coût anormal de l'agent sur la journée : suspension et alerte.
    const cout = await avecAgentOrchestrateur((client) =>
      client.query(
        "select coalesce(sum(cout_usd), 0)::float as total from taches where agent = $1 and cree_le > now() - interval '1 day'",
        [tache.agent],
      ),
    );
    const controle = controlerCout(
      tache.agent as Decision["agent"] & string,
      cout.rows[0].total,
      coutJourMaxUSD(),
    );
    if (controle.suspendre) {
      await avecAgentOrchestrateur((client) =>
        client.query("update etat_agents set suspendu = true, motif = $2 where agent = $1", [
          tache.agent,
          controle.alerte,
        ]),
      );
      await auditer(
        { role: "agent_orchestrateur" },
        "suspension_agent",
        { type: "agent" },
        { agent: tache.agent },
      );
      await alerter(controle.alerte, 1);
    }
  }
  return traitees;
}

export interface EtatTache {
  id: string;
  statut: "en_attente" | "en_cours" | "terminee" | "echouee" | "bloquee" | "suspendue";
  motif: string | null;
  resultat: Record<string, unknown> | null;
}

export async function etatTache(id: string): Promise<EtatTache | null> {
  return avecAgentOrchestrateur(async (client) => {
    const { rows } = await client.query(
      "select id, statut, motif, resultat from taches where id = $1",
      [id],
    );
    return (rows[0] as EtatTache | undefined) ?? null;
  });
}
