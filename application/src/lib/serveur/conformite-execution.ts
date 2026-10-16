import "server-only";
import { composerPrompt } from "@/lib/agents/chargeur-prompt";
import { controlerRapport, genererRapportConformite } from "@/lib/agents/conformite/rapport";
import type { ParametresModele } from "@/lib/agents/professeur/boucle";
import { coutUSD } from "@/lib/tests-agents/cout";
import { avecAgentConformite } from "./base";
import { agentSuspendu, MESSAGE_AGENT_SUSPENDU } from "./disponibilite";
import { modeleDesAgents } from "./professeur";

// Analyse d'un document officiel par l'agent Conformité programme (ADR 0039), lancée par l'exécuteur de la file
// de l'Orchestrateur. Lectures sous le rôle agent_conformite : son document, le référentiel, l'unité comparée.

export const SKILLS_CONFORMITE = [
  "_commun/skills/contenu-non-fiable",
  "conformite/skills/audit-de-couverture",
  "conformite/skills/comparaison-de-referentiels",
];
const EXTRAIT_MAX = 1200;

function entier(nom: string, defaut: number): number {
  const v = Number(process.env[nom]);
  return Number.isInteger(v) && v > 0 ? v : defaut;
}

export function parametresConformite(): ParametresModele {
  const effort = process.env.EFFORT_CONFORMITE ?? "high";
  return {
    modele: process.env.MODELE_CONFORMITE ?? "claude-opus-5-5",
    effort: (["low", "medium", "high", "xhigh", "max"].includes(effort)
      ? effort
      : "high") as ParametresModele["effort"],
    maxTokens: entier("MAX_JETONS_CONFORMITE", 32000),
  };
}

export type ResultatAnalyse =
  { ok: true; coutUSD: number; resultat: Record<string, unknown> } | { ok: false; erreur: string };

/** Alertes qui demandent un humain : elles rejoignent aussi la file humaine. */
const ALERTES_HUMAINES = new Set([
  "source_contradictoire",
  "reforme_ou_version_incertaine",
  "document_illisible",
  "ecart_majeur",
  "instruction_cachee",
]);

export async function executerAnalyse(entrees: {
  referentiel_id: string;
  unite_id: string;
  document_id: string;
  demande_par?: string | null;
  donnees_non_fiables?: { details?: string };
}): Promise<ResultatAnalyse> {
  if (await agentSuspendu("conformite")) return { ok: false, erreur: MESSAGE_AGENT_SUSPENDU };
  const contexte = {
    referentielId: entrees.referentiel_id,
    uniteId: entrees.unite_id,
    documentId: entrees.document_id,
  };
  const lu = await avecAgentConformite(contexte, async (client) => {
    const doc = (
      await client.query(
        "select titre, origine, declare_officiel, format, texte, pdf from documents_officiels",
      )
    ).rows[0];
    const u = (
      await client.query(
        `select u.code, n.libelle as niveau, coalesce(u.libelle_local, m.libelle) as matiere, r.pays_code,
           r.code as referentiel, r.version, p.nom as pays,
           coalesce((select array_agg(s.libelle order by s.code) from unites_series us join series s on s.id = us.serie_id
                     where us.unite_id = u.id), '{}') as series
         from unites u join niveaux n on n.id = u.niveau_id join matieres m on m.id = u.matiere_id
         join referentiels r on r.id = u.referentiel_id join pays p on p.code = r.pays_code
         where u.id = $1`,
        [entrees.unite_id],
      )
    ).rows[0];
    if (!doc || !u) return null;
    const chapitres = (
      await client.query(
        "select id, code, titre, statut from chapitres where unite_id = $1 order by ordre",
        [entrees.unite_id],
      )
    ).rows;
    const refs = new Map<string, string>(chapitres.map((c) => [c.id, `${u.code}/${c.code}`]));
    const scripts = (
      await client.query(
        "select chapitre_id, contenu from scripts order by chapitre_id, version desc",
      )
    ).rows;
    const quiz = (
      await client.query(
        "select chapitre_id, questions from quiz order by chapitre_id, version desc",
      )
    ).rows;
    const vus = new Set<string>();
    const contenus = [
      ...scripts.map((s) => ({
        chapitre_id: s.chapitre_id,
        type: "script" as const,
        corps: JSON.stringify(s.contenu),
      })),
      ...quiz.map((q) => ({
        chapitre_id: q.chapitre_id,
        type: "quiz" as const,
        corps: (q.questions as { enonce?: string }[])
          .map((x, i) => `${i + 1}. ${x.enonce ?? ""}`)
          .join("\n"),
      })),
    ]
      .filter((c) => {
        const cle = `${c.type}:${c.chapitre_id}`;
        if (vus.has(cle) || !refs.has(c.chapitre_id)) return false;
        vus.add(cle);
        return true;
      })
      .map((c) => ({
        chapitre: refs.get(c.chapitre_id)!,
        type: c.type,
        extrait: c.corps.length > EXTRAIT_MAX ? `${c.corps.slice(0, EXTRAIT_MAX)}…` : c.corps,
      }));
    return { doc, u, chapitres, contenus };
  });
  if (!lu) return { ok: false, erreur: "Document ou unité introuvable." };
  const { doc, u } = lu;
  const comparaison = {
    unite: u.code as string,
    chapitres: lu.chapitres.map((c) => ({
      ref: `${u.code}/${c.code}`,
      titre: c.titre,
      statut: c.statut,
    })),
    declareOfficiel: doc.declare_officiel as boolean,
    niveau: u.niveau,
    series: u.series,
    matiere: u.matiere,
    pays: u.pays,
  };
  const parametres = parametresConformite();
  const resultat = await genererRapportConformite({
    systeme: composerPrompt({
      agent: "conformite",
      codePays: u.pays_code,
      unite: "pays",
      skills: SKILLS_CONFORMITE,
      valeursDynamiques: { REFERENTIEL: u.referentiel, VERSION_REFERENTIEL: u.version },
    }),
    demande: {
      document: {
        titre: doc.titre,
        origine: doc.origine,
        declareOfficiel: doc.declare_officiel,
        texte: doc.texte,
        pdf: doc.format === "pdf",
      },
      comparaison,
      contenus: lu.contenus,
      consigne: entrees.donnees_non_fiables?.details?.trim() || null,
    },
    pdfBase64: doc.pdf ? Buffer.from(doc.pdf).toString("base64") : null,
    modele: modeleDesAgents(),
    parametres,
  });
  const cout = resultat.consommations.reduce((s, c) => s + (coutUSD(parametres.modele, c) || 0), 0);
  if (!resultat.sortie) return { ok: false, erreur: `Rapport inexploitable (${resultat.arret}).` };
  const { rapport, problemes } = controlerRapport(resultat.sortie, comparaison);
  const enregistre = await avecAgentConformite(contexte, async (client) => {
    const { rows } = await client.query(
      `insert into rapports_conformite (referentiel_id, document_id, unite_id, contenu, controles, demande_par)
       values ($1, $2, $3, $4, $5, $6) returning id, version`,
      [
        entrees.referentiel_id,
        entrees.document_id,
        entrees.unite_id,
        rapport,
        JSON.stringify(problemes),
        entrees.demande_par ?? null,
      ],
    );
    const humaines = rapport.alertes.filter((a) => ALERTES_HUMAINES.has(a.type));
    for (const a of humaines.slice(0, 5))
      await client.query(
        `insert into signalements (source, motif, priorite, resume) values ('agent_conformite', 'autre', 3, $1)`,
        [
          `Conformité (${u.code}, « ${doc.titre} », rapport ${rows[0].version}) : ${a.detail}`.slice(
            0,
            2000,
          ),
        ],
      );
    return rows[0];
  });
  return {
    ok: true,
    coutUSD: cout,
    resultat: {
      rapportId: enregistre.id,
      version: enregistre.version,
      extraits: rapport.extraction.length,
      alertes: rapport.alertes.length,
      controles: problemes.length,
    },
  };
}
