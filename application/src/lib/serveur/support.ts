import "server-only";
import { composerPrompt, dossierPack, racineDepot } from "@/lib/agents/chargeur-prompt";
import type { ParametresModele } from "@/lib/agents/professeur/boucle";
import { lireFaq, type Faq } from "@/lib/agents/support/faq";
import {
  controlerReponse,
  masquerDonneesSensibles,
  repondreSupport,
  type DemandeSupport,
  type ReponseSupport,
} from "@/lib/agents/support/reponse";
import { avecAgentSupport, avecUtilisateur, avecVisiteur } from "./base";
import { alerterVeilleSansAttendre } from "./veille";
import { accesElevesOuvert, agentSuspendu, MESSAGE_AGENT_SUSPENDU } from "./disponibilite";
import { modeleDesAgents } from "./professeur";

// Agent Support/inscription sur le site (ADR 0027, 0032) : réponse à partir de la FAQ validée du pack pays ;
// tickets et signalements ouverts sous le rôle agent_support pour la seule personne qui écrit ; aucun code,
// mot de passe ni donnée bancaire conservé ; la conversation n'est pas enregistrée.

export const LONGUEUR_MESSAGE_MAX = 1000;
const QUESTIONS_PAR_JOUR = 20;

function entier(nom: string, defaut: number): number {
  const v = Number(process.env[nom]);
  return Number.isInteger(v) && v > 0 ? v : defaut;
}

export function parametresSupport(): ParametresModele {
  const effort = process.env.EFFORT_SUPPORT ?? "low";
  return {
    modele: process.env.MODELE_SUPPORT ?? "claude-opus-5-5",
    effort: (["low", "medium", "high", "xhigh", "max"].includes(effort)
      ? effort
      : "low") as ParametresModele["effort"],
    maxTokens: entier("MAX_JETONS_SUPPORT", 4000),
  };
}

/**
 * Pays du référentiel de l'élève ; sinon celui que la personne a choisi (code de référentiel), sinon le
 * premier référentiel publié (comme à l'inscription).
 */
async function contexte(utilisateur: string | null, referentielChoisi: string | null = null) {
  const requete = async (client: import("pg").PoolClient) => {
    // Un visiteur n'a aucun droit sur la table des élèves : on ne la lit que pour une personne connectée.
    const r = (
      utilisateur
        ? await client.query(
            `select r.id, r.pays_code from referentiels r
             left join eleves e on e.referentiel_id = r.id and e.id = $1
             order by (e.id is null), (r.code = $2) desc, r.code limit 1`,
            [utilisateur, referentielChoisi ?? ""],
          )
        : await client.query(
            "select id, pays_code from referentiels order by (code = $1) desc, code limit 1",
            [referentielChoisi ?? ""],
          )
    ).rows[0];
    if (!r) return null;
    const classes = (
      await client.query("select libelle from niveaux where referentiel_id = $1 order by ordre", [
        r.id,
      ])
    ).rows.map((x) => x.libelle as string);
    const series = (
      await client.query("select libelle from series where referentiel_id = $1 order by code", [
        r.id,
      ])
    ).rows.map((x) => x.libelle as string);
    return { codePays: r.pays_code as string, classes, series };
  };
  return utilisateur ? avecUtilisateur(utilisateur, requete) : avecVisiteur(requete);
}

/** FAQ affichée à tous (sans modèle de langage). */
export async function faqDuSite(
  utilisateur: string | null,
  referentielChoisi: string | null = null,
): Promise<Faq> {
  const c = await contexte(utilisateur, referentielChoisi);
  return c
    ? lireFaq(dossierPack(racineDepot(), c.codePays))
    : { statut: "absente", delaiReponseTickets: null, entrees: [] };
}

async function statutCompte(utilisateur: string): Promise<DemandeSupport["statutCompte"]> {
  return avecUtilisateur(utilisateur, async (client) => {
    const p = (await client.query("select role from profils where id = $1", [utilisateur])).rows[0];
    if (!p) return "non_inscrit";
    if (p.role === "referent") return "referent";
    if (p.role !== "eleve") return "autre";
    const e = (await client.query("select statut from eleves where id = $1", [utilisateur]))
      .rows[0];
    return (e?.statut ?? "autre") as DemandeSupport["statutCompte"];
  });
}

export type ResultatSupport =
  | { ok: true; reponse: string; ticket: boolean; orientationProfesseur: boolean }
  | { ok: false; erreur: string };

export async function questionAuSupport(
  utilisateur: string,
  message: string,
  referentielChoisi: string | null = null,
): Promise<ResultatSupport> {
  const texte = message.trim();
  if (!texte || texte.length > LONGUEUR_MESSAGE_MAX)
    return { ok: false, erreur: `Message de 1 à ${LONGUEUR_MESSAGE_MAX} caractères.` };
  if (!(await accesElevesOuvert()) || (await agentSuspendu("support")))
    return { ok: false, erreur: MESSAGE_AGENT_SUSPENDU };
  // Quota tenu en base (ADR 0036) : valable même avec plusieurs instances du serveur.
  const dansLeQuota = await avecAgentSupport(utilisateur, (client) =>
    client
      .query("select prendre_quota_support($1) as ok", [
        entier("QUESTIONS_SUPPORT_PAR_JOUR", QUESTIONS_PAR_JOUR),
      ])
      .then((r) => r.rows[0].ok as boolean),
  );
  if (!dansLeQuota)
    return { ok: false, erreur: "Tu as posé beaucoup de questions aujourd'hui. Reviens demain." };

  const ctx = await contexte(utilisateur, referentielChoisi);
  if (!ctx) return { ok: false, erreur: "Aide indisponible pour le moment." };
  const faq = lireFaq(dossierPack(racineDepot(), ctx.codePays));
  const resultat = await repondreSupport({
    systeme: composerPrompt({
      agent: "support",
      codePays: ctx.codePays,
      unite: "pays",
      skills: ["_commun/skills/contenu-non-fiable", "support/skills/tri-des-demandes"],
      valeursDynamiques: {},
    }),
    demande: {
      message: texte,
      faq,
      statutCompte: await statutCompte(utilisateur),
      classes: ctx.classes,
      series: ctx.series,
    },
    modele: modeleDesAgents(),
    parametres: parametresSupport(),
  });
  const r: ReponseSupport | null = resultat.sortie;
  if (!r || controlerReponse(r, faq).length > 0) {
    // Réponse inexploitable : on n'improvise pas, un humain reprend la demande.
    await ouvrirTicket(
      utilisateur,
      "autre",
      3,
      "Question non traitée automatiquement : à reprendre par un humain.",
    );
    return {
      ok: true,
      reponse: "Je transmets ta demande à l'équipe, qui te répondra.",
      ticket: true,
      orientationProfesseur: false,
    };
  }
  const ticket = r.action === "ouvrir_ticket" || r.action === "escalade_humain";
  if (ticket)
    await ouvrirTicket(
      utilisateur,
      r.categorie,
      r.categorie === "detresse" ? 1 : r.priorite,
      r.resume_ticket,
    );
  if (r.categorie === "detresse")
    await avecAgentSupport(utilisateur, (client) =>
      client.query(
        `insert into signalements (source, motif, priorite, eleve_id, resume)
         values ('agent_support', 'detresse', 1, (select id from eleves where id = $1), $2)`,
        [
          utilisateur,
          masquerDonneesSensibles(r.resume_ticket).slice(0, 2000) ||
            "Détresse exprimée auprès du support.",
        ],
      ),
    );
  if (ticket || r.categorie === "detresse") await alerterVeilleSansAttendre();
  return {
    ok: true,
    reponse: r.reponse,
    ticket,
    orientationProfesseur: r.action === "orienter_professeur",
  };
}

async function ouvrirTicket(
  utilisateur: string,
  categorie: ReponseSupport["categorie"],
  priorite: number,
  resume: string,
): Promise<void> {
  await avecAgentSupport(utilisateur, async (client) => {
    // Le demandeur n'est rattaché que s'il a déjà un profil (une personne en cours d'inscription n'en a pas).
    const profil = (
      await client.query("select exists (select 1 from eleves where id = $1) as e", [utilisateur])
    ).rows[0].e;
    await client.query(
      "insert into tickets_support (demandeur_id, categorie, priorite, resume) values ($1, $2, $3, $4)",
      [
        profil ? utilisateur : null,
        categorie,
        priorite,
        masquerDonneesSensibles(resume).slice(0, 2000) || "(sans résumé)",
      ],
    );
  });
}
