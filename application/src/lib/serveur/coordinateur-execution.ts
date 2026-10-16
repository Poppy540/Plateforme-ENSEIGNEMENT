import "server-only";
import { composerPrompt, dossierPack, racineDepot } from "@/lib/agents/chargeur-prompt";
import type { DonneesFamille, UniteFamille } from "@/lib/agents/coordinateur/analyse";
import { skillsCoordinateur } from "@/lib/agents/coordinateur/configuration";
import { controlerSortie, genererRevue } from "@/lib/agents/coordinateur/revue";
import type { ParametresModele } from "@/lib/agents/professeur/boucle";
import { libellesFamilles } from "@/lib/pack-pays/lecture";
import { coutUSD } from "@/lib/tests-agents/cout";
import { avecAgentCoordinateur } from "./base";
import { agentSuspendu, MESSAGE_AGENT_SUSPENDU } from "./disponibilite";
import { modeleDesAgents } from "./professeur";
import { alerterVeilleSansAttendre } from "./veille";

// Exécution d'une revue de cohérence par le Coordinateur (ADR 0038), lancée par l'exécuteur de la file de
// l'Orchestrateur. Toutes les lectures se font sous le rôle agent_coordinateur, pour la seule famille demandée.

const EXTRAIT_MAX = 1200;
const CONTENUS_MAX = 40;

function entier(nom: string, defaut: number): number {
  const v = Number(process.env[nom]);
  return Number.isInteger(v) && v > 0 ? v : defaut;
}

export function parametresCoordinateur(): ParametresModele {
  const effort = process.env.EFFORT_COORDINATEUR ?? "high";
  return {
    modele: process.env.MODELE_COORDINATEUR ?? "claude-opus-5-5",
    effort: (["low", "medium", "high", "xhigh", "max"].includes(effort)
      ? effort
      : "high") as ParametresModele["effort"],
    maxTokens: entier("MAX_JETONS_COORDINATEUR", 32000),
  };
}

/** Résumé lisible d'un contenu validé (texte du script ou énoncés du quiz), tronqué. */
function extrait(type: "script" | "quiz", contenu: unknown): string {
  const brut =
    type === "quiz"
      ? (Array.isArray(contenu) ? contenu : [])
          .map((q, i) => `${i + 1}. ${(q as { enonce?: string }).enonce ?? ""}`)
          .join("\n")
      : JSON.stringify(contenu);
  return brut.length > EXTRAIT_MAX ? `${brut.slice(0, EXTRAIT_MAX)}…` : brut;
}

/** Données de la famille, lues sous le rôle du Coordinateur (aucune donnée d'élève accessible). */
export async function donneesFamille(referentielId: string, famille: string) {
  return avecAgentCoordinateur({ referentielId, famille }, async (client) => {
    const r = (
      await client.query("select pays_code from referentiels where id = $1", [referentielId])
    ).rows[0];
    if (!r) return null;
    const lignes = (
      await client.query(
        `select u.code as unite, n.libelle as niveau, n.ordre as ordre_niveau,
           coalesce((select array_agg(s.code order by s.code) from unites_series us join series s on s.id = us.serie_id
                     where us.unite_id = u.id), '{}') as series,
           c.id, c.code, c.titre, c.statut, c.sous_themes
         from chapitres c join unites u on u.id = c.unite_id join niveaux n on n.id = u.niveau_id
         order by n.ordre, u.code, c.ordre`,
      )
    ).rows;
    const refs = new Map<string, string>(lignes.map((l) => [l.id, `${l.unite}/${l.code}`]));
    const unites = new Map<string, UniteFamille>();
    for (const l of lignes) {
      const u: UniteFamille = unites.get(l.unite) ?? {
        code: l.unite,
        niveau: l.niveau,
        ordreNiveau: l.ordre_niveau,
        series: l.series,
        chapitres: [],
      };
      u.chapitres.push({
        ref: `${l.unite}/${l.code}`,
        titre: l.titre,
        statut: l.statut,
        sousThemes: l.sous_themes ?? [],
      });
      unites.set(l.unite, u);
    }
    const liens = (
      await client.query(
        "select chapitre_id, prerequis_id, nature, statut from prerequis_chapitres",
      )
    ).rows
      .filter((l) => refs.has(l.chapitre_id) && refs.has(l.prerequis_id))
      .map((l) => ({
        chapitre: refs.get(l.chapitre_id)!,
        prerequis: refs.get(l.prerequis_id)!,
        nature: l.nature,
        statut: l.statut,
      }));
    const scripts = (
      await client.query(
        "select chapitre_id, version, contenu from scripts order by chapitre_id, version desc",
      )
    ).rows;
    const quiz = (
      await client.query(
        "select chapitre_id, version, questions from quiz order by chapitre_id, version desc",
      )
    ).rows;
    // Dernière version validée de chaque contenu, par chapitre.
    const vus = new Set<string>();
    const contenus = [
      ...scripts.map((s) => ({ ...s, type: "script" as const, corps: s.contenu })),
      ...quiz.map((q) => ({ ...q, type: "quiz" as const, corps: q.questions })),
    ]
      .filter((c) => {
        const cle = `${c.type}:${c.chapitre_id}`;
        if (vus.has(cle) || !refs.has(c.chapitre_id)) return false;
        vus.add(cle);
        return true;
      })
      .slice(0, CONTENUS_MAX)
      .map((c) => ({
        chapitre: refs.get(c.chapitre_id)!,
        type: c.type,
        version: c.version,
        extrait: extrait(c.type, c.corps),
      }));
    const statistiques = (
      await client.query(
        "select chapitre_id, question, tentatives, taux_reussite from statistiques_famille()",
      )
    ).rows.map((s) => ({
      chapitre: refs.get(s.chapitre_id) ?? "?",
      question: s.question,
      tentatives: s.tentatives,
      tauxReussite: Number(s.taux_reussite),
    }));
    const quizTropPetits = (await client.query("select quiz_trop_petits_famille() as n")).rows[0].n;
    const charte =
      (await client.query("select glossaire from chartes_famille order by version desc limit 1"))
        .rows[0]?.glossaire ?? [];
    const donnees: DonneesFamille = {
      famille,
      libelleFamille: libellesFamilles(dossierPack(racineDepot(), r.pays_code))[famille] ?? famille,
      unites: [...unites.values()],
      liens,
      contenus,
      statistiques,
      quizTropPetits,
      charte,
    };
    return { codePays: r.pays_code as string, donnees };
  });
}

export type ResultatRevue =
  { ok: true; coutUSD: number; resultat: Record<string, unknown> } | { ok: false; erreur: string };

/** Revue complète : lecture, appel du modèle, contrôles, rapport brouillon, alerte si nécessaire. */
export async function executerRevue(entrees: {
  referentiel_id: string;
  famille: string;
  demande_par?: string | null;
  donnees_non_fiables?: { details?: string };
}): Promise<ResultatRevue> {
  if (await agentSuspendu("coordinateur")) return { ok: false, erreur: MESSAGE_AGENT_SUSPENDU };
  const lu = await donneesFamille(entrees.referentiel_id, entrees.famille);
  if (!lu || lu.donnees.unites.length === 0)
    return { ok: false, erreur: "Famille sans programme dans ce référentiel." };
  const parametres = parametresCoordinateur();
  const resultat = await genererRevue({
    systeme: composerPrompt({
      agent: "coordinateur",
      codePays: lu.codePays,
      unite: entrees.famille,
      skills: skillsCoordinateur(dossierPack(racineDepot(), lu.codePays), entrees.famille),
      valeursDynamiques: {},
    }),
    donnees: lu.donnees,
    consigne: entrees.donnees_non_fiables?.details?.trim() || null,
    modele: modeleDesAgents(),
    parametres,
  });
  const cout = resultat.consommations.reduce((s, c) => s + (coutUSD(parametres.modele, c) || 0), 0);
  if (!resultat.sortie) return { ok: false, erreur: `Revue inexploitable (${resultat.arret}).` };
  const { sortie, problemes } = controlerSortie(resultat.sortie, lu.donnees);
  const rapport = await avecAgentCoordinateur(
    { referentielId: entrees.referentiel_id, famille: entrees.famille },
    async (client) => {
      const { rows } = await client.query(
        `insert into rapports_coordinateur (referentiel_id, famille, contenu, controles, demande_par)
         values ($1, $2, $3, $4, $5) returning id, version`,
        [
          entrees.referentiel_id,
          entrees.famille,
          sortie,
          JSON.stringify(problemes),
          entrees.demande_par ?? null,
        ],
      );
      // Alerte immédiate (erreur factuelle publiée, sujet sensible, instruction cachée) : file humaine.
      const alertes = sortie.constats.filter((c) => c.alerte_immediate);
      for (const a of alertes.slice(0, 5))
        await client.query(
          `insert into signalements (source, motif, priorite, resume)
           values ('agent_coordinateur', 'erreur_contenu', 2, $1)`,
          [
            `Coordinateur (${entrees.famille}, rapport ${rows[0].version}) : ${a.constat}`.slice(
              0,
              2000,
            ),
          ],
        );
      return { ...rows[0], alertes: alertes.length };
    },
  );
  if (rapport.alertes > 0) await alerterVeilleSansAttendre();
  return {
    ok: true,
    coutUSD: cout,
    resultat: {
      rapportId: rapport.id,
      version: rapport.version,
      constats: sortie.constats.length,
      propositions: sortie.propositions_liens.length,
      controles: problemes.length,
      refus: sortie.refus || null,
    },
  };
}
