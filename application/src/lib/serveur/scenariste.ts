import "server-only";
import { DatabaseError } from "pg";
import { composerPrompt } from "@/lib/agents/chargeur-prompt";
import type { ParametresModele } from "@/lib/agents/professeur/boucle";
import { genererScript } from "@/lib/agents/scenariste/generation";
import {
  controlerStructure,
  lireSortie,
  scriptEnTexte,
  type SortieScenariste,
} from "@/lib/agents/scenariste/script";
import { avecAgentScenariste, avecUtilisateur } from "./base";
import { agentSuspendu, MESSAGE_AGENT_SUSPENDU } from "./disponibilite";
import { modeleDesAgents } from "./professeur";
import { deciderContenu } from "./validation";

// Agent Scénariste côté serveur (ADR 0022) : lancé par un enseignant-référent pour un chapitre validé de
// sa famille ; lectures et écriture sous le rôle agent_scenariste (unité fixée par le serveur) ; le brouillon
// est enregistré tel quel, statut « brouillon » imposé par la base. Aucun contenu n'est journalisé.

const SKILLS_SCENARISTE = [
  "_commun/skills/contenu-non-fiable",
  "scenariste/skills/script-pense-a-voix-haute",
  "scenariste/skills/ancrage-local",
];
export const DUREE_MIN = 2;
export const DUREE_MAX = 30;
export const LONGUEUR_CONSIGNE_MAX = 1000;

function entier(nom: string, defaut: number): number {
  const v = Number(process.env[nom]);
  return Number.isInteger(v) && v > 0 ? v : defaut;
}

export function parametresScenariste(): ParametresModele {
  const effort = (process.env.EFFORT_SCENARISTE ?? "high") as ParametresModele["effort"];
  return {
    modele: process.env.MODELE_SCENARISTE ?? "claude-opus-5-5",
    effort: ["low", "medium", "high", "xhigh", "max"].includes(effort) ? effort : "high",
    maxTokens: entier("MAX_JETONS_SCENARISTE", 64000),
  };
}

export type ResultatBrouillon =
  | { ok: true; version: number; aRelireEnPriorite: boolean; remarques: string[] }
  | { ok: false; erreur: string };

export async function genererBrouillonScript(
  referent: string,
  demande: {
    chapitreId: string;
    dureeMinutes: number;
    consigne: string | null;
    /** Révision d'un script existant du même chapitre : la consigne (corrections) est alors obligatoire. */
    revisionDe?: string;
  },
): Promise<ResultatBrouillon> {
  if (await agentSuspendu("scenariste")) return { ok: false, erreur: MESSAGE_AGENT_SUSPENDU };
  if (demande.revisionDe !== undefined && !/^[0-9a-f-]{36}$/.test(demande.revisionDe))
    return { ok: false, erreur: "Script inconnu." };
  if (demande.revisionDe && !demande.consigne)
    return { ok: false, erreur: "Indiquez les corrections attendues." };
  if (!/^[0-9a-f-]{36}$/.test(demande.chapitreId))
    return { ok: false, erreur: "Chapitre inconnu." };
  if (
    !Number.isInteger(demande.dureeMinutes) ||
    demande.dureeMinutes < DUREE_MIN ||
    demande.dureeMinutes > DUREE_MAX
  )
    return { ok: false, erreur: `Durée entre ${DUREE_MIN} et ${DUREE_MAX} minutes.` };
  if (demande.consigne && demande.consigne.length > LONGUEUR_CONSIGNE_MAX)
    return {
      ok: false,
      erreur: `Consigne trop longue (${LONGUEUR_CONSIGNE_MAX} caractères au plus).`,
    };

  // 1. Le demandeur est référent de la famille et le chapitre est validé (vérifié par la base).
  const chapitre = await avecUtilisateur(referent, async (client) => {
    const { rows } = await client.query(
      `select c.id, c.statut, u.id as unite_id, u.code as unite, r.pays_code
       from chapitres c join unites u on u.id = c.unite_id join referentiels r on r.id = u.referentiel_id
       where c.id = $1 and est_referent_du_chapitre(c.id)`,
      [demande.chapitreId],
    );
    return rows[0] as
      | { id: string; statut: string; unite_id: string; unite: string; pays_code: string }
      | undefined;
  });
  if (!chapitre) return { ok: false, erreur: "Chapitre inconnu." };
  if (chapitre.statut !== "valide")
    return { ok: false, erreur: "Le chapitre doit d'abord être validé." };

  // 2. Contexte lu sous le rôle de l'agent : seulement ce que l'agent a le droit de voir.
  const limite = entier("SCRIPTS_PAR_CHAPITRE_PAR_JOUR", 3);
  const contexte = await avecAgentScenariste(chapitre.unite_id, async (client) => {
    const programme = (
      await client.query(
        "select titre from chapitres where unite_id = $1 and statut = 'valide' order by ordre",
        [chapitre.unite_id],
      )
    ).rows.map((r) => r.titre as string);
    const { rows } = await client.query("select titre, sous_themes from chapitres where id = $1", [
      chapitre.id,
    ]);
    const prerequis = (
      await client.query(
        `select c.titre from prerequis_chapitres p join chapitres c on c.id = p.prerequis_id
         where p.chapitre_id = $1 order by c.titre`,
        [chapitre.id],
      )
    ).rows.map((r) => r.titre as string);
    const aujourdhui = Number(
      (
        await client.query(
          "select count(*) from scripts where chapitre_id = $1 and cree_le > now() - interval '1 day'",
          [chapitre.id],
        )
      ).rows[0].count,
    );
    let precedent: string | null = null;
    if (demande.revisionDe) {
      const { rows: anciens } = await client.query(
        "select contenu from scripts where id = $1 and chapitre_id = $2",
        [demande.revisionDe, chapitre.id],
      );
      const sortie = anciens[0] && lireSortie(JSON.stringify(anciens[0].contenu));
      precedent = sortie ? scriptEnTexte(sortie) : null;
    }
    return { programme, chapitre: rows[0], prerequis, aujourdhui, precedent };
  });
  if (demande.revisionDe && !contexte.precedent) return { ok: false, erreur: "Script inconnu." };
  if (!contexte.chapitre) return { ok: false, erreur: "Chapitre inconnu." };
  if (contexte.aujourdhui >= limite)
    return {
      ok: false,
      erreur: `Limite atteinte : ${limite} brouillons par chapitre et par jour. Réessayez demain.`,
    };

  // 3. Génération.
  const systeme = composerPrompt({
    agent: "scenariste",
    codePays: chapitre.pays_code,
    unite: chapitre.unite,
    skills: SKILLS_SCENARISTE,
    valeursDynamiques: { DUREE: `${demande.dureeMinutes} minutes` },
  });
  const parametres = parametresScenariste();
  const resultat = await genererScript({
    systeme,
    demande: {
      programmeValide: contexte.programme,
      chapitre: { titre: contexte.chapitre.titre, sousThemes: contexte.chapitre.sous_themes ?? [] },
      prerequis: contexte.prerequis,
      dureeMinutes: demande.dureeMinutes,
      consigne: demande.consigne ?? undefined,
      scriptPrecedent: contexte.precedent ?? undefined,
    },
    modele: modeleDesAgents("scenariste"),
    parametres,
  });
  if (resultat.arret === "refus")
    return { ok: false, erreur: "Le modèle a refusé cette demande. Reformulez la consigne." };
  if (!resultat.sortie)
    return {
      ok: false,
      erreur:
        resultat.arret === "tronque"
          ? "Script trop long, génération interrompue. Réduisez la durée."
          : "Réponse illisible du modèle. Réessayez.",
    };
  const sortie = resultat.sortie;
  if (sortie.decision === "refus")
    return { ok: false, erreur: `Le Scénariste n'a pas rédigé : ${sortie.message_au_referent}` };

  // 4. Enregistrement du brouillon (version et statut fixés par la base).
  try {
    const version = await avecAgentScenariste(chapitre.unite_id, async (client) => {
      const contenu = {
        metadonnees: {
          unite: chapitre.unite,
          chapitre: contexte.chapitre.titre,
          modele: parametres.modele,
          genere_le: new Date().toISOString(),
        },
        consigne: demande.consigne,
        revision_de: demande.revisionDe ?? null,
        ...sortie,
      };
      const { rows } = await client.query(
        `insert into scripts (chapitre_id, contenu, duree_cible_minutes, cree_par)
         values ($1, $2, $3, 'agent_scenariste') returning version`,
        [chapitre.id, contenu, demande.dureeMinutes],
      );
      return rows[0].version as number;
    });
    return {
      ok: true,
      version,
      aRelireEnPriorite: sortie.a_relire_en_priorite,
      remarques: controlerStructure(sortie, demande.dureeMinutes),
    };
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "42501")
      return { ok: false, erreur: "Enregistrement refusé pour ce chapitre." };
    throw erreur;
  }
}

export interface ScriptResume {
  id: string;
  version: number;
  statut: "brouillon" | "valide" | "rejete";
  dureeCibleMinutes: number;
  creeLe: string;
  aRelireEnPriorite: boolean;
}

/** Scripts d'un chapitre de la famille du référent (règles d'accès de la base). */
export function scriptsDuChapitre(referent: string, chapitreId: string): Promise<ScriptResume[]> {
  return avecUtilisateur(referent, async (client) => {
    const { rows } = await client.query(
      `select id, version, statut, duree_cible_minutes as "dureeCibleMinutes", cree_le as "creeLe",
         coalesce((contenu ->> 'a_relire_en_priorite')::boolean, false) as "aRelireEnPriorite"
       from scripts where chapitre_id = $1 order by version desc`,
      [chapitreId],
    );
    return rows as ScriptResume[];
  });
}

export interface ScriptDetaille extends ScriptResume {
  chapitreId: string;
  chapitreTitre: string;
  unite: string;
  empreinte: string;
  contenu: SortieScenariste & { consigne?: string | null; revision_de?: string | null };
  historique: {
    decision: "valide" | "rejete";
    commentaire: string | null;
    valideur: string | null;
    decideLe: string;
  }[];
}

/** Script de la famille du référent (null s'il n'y a pas accès). */
export function scriptPourReferent(referent: string, id: string): Promise<ScriptDetaille | null> {
  return avecUtilisateur(referent, async (client) => {
    if (!/^[0-9a-f-]{36}$/.test(id)) return null;
    const { rows } = await client.query(
      `select s.id, s.version, s.statut, s.duree_cible_minutes as "dureeCibleMinutes", s.cree_le as "creeLe",
         coalesce((s.contenu ->> 'a_relire_en_priorite')::boolean, false) as "aRelireEnPriorite",
         s.empreinte, s.contenu, c.id as "chapitreId", c.titre as "chapitreTitre", u.code as unite
       from scripts s join chapitres c on c.id = s.chapitre_id join unites u on u.id = c.unite_id
       where s.id = $1`,
      [id],
    );
    const ligne = rows[0];
    if (!ligne || !lireSortie(JSON.stringify(ligne.contenu))) return null;
    const historique = (
      await client.query(
        `select a.decision, a.commentaire, p.prenom_ou_pseudo as valideur, a.decide_le as "decideLe"
         from approbations a left join profils p on p.id = a.valideur_id
         where a.objet_type = 'script' and a.objet_id = $1 order by a.decide_le desc`,
        [id],
      )
    ).rows;
    return { ...ligne, historique } as ScriptDetaille;
  });
}

export interface ScriptARelire {
  id: string;
  version: number;
  chapitreTitre: string;
  unite: string;
  creeLe: string;
  aRelireEnPriorite: boolean;
}

/** Brouillons de scripts des familles du référent, les sujets sensibles d'abord. */
export function scriptsARelire(referent: string): Promise<ScriptARelire[]> {
  return avecUtilisateur(referent, async (client) => {
    const { rows } = await client.query(
      `select s.id, s.version, c.titre as "chapitreTitre", u.code as unite, s.cree_le as "creeLe",
         coalesce((s.contenu ->> 'a_relire_en_priorite')::boolean, false) as "aRelireEnPriorite"
       from scripts s join chapitres c on c.id = s.chapitre_id join unites u on u.id = c.unite_id
       where s.statut = 'brouillon'
       order by "aRelireEnPriorite" desc, s.cree_le`,
    );
    return rows as ScriptARelire[];
  });
}

/** Décision du référent sur la version lue d'un script. */
export function deciderScript(
  referent: string,
  decision: {
    id: string;
    decision: "valide" | "rejete";
    version: number;
    commentaire: string | null;
  },
) {
  return deciderContenu(referent, "script", decision);
}
