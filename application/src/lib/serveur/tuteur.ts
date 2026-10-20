import "server-only";
import { composerPrompt } from "@/lib/agents/chargeur-prompt";
import type { ParametresModele } from "@/lib/agents/professeur/boucle";
import { candidatsDeRevision, type ChapitreParcours } from "@/lib/agents/tuteur/analyse";
import { controlerPlan, genererPlan, type PlanTuteur } from "@/lib/agents/tuteur/plan";
import { avecAgentTuteur, avecUtilisateur, prendreQuotaEleve } from "./base";
import { alerterVeilleSansAttendre } from "./veille";
import { accesElevesOuvert, agentSuspendu, MESSAGE_AGENT_SUSPENDU } from "./disponibilite";
import { modeleDesAgents } from "./professeur";

// Agent Tuteur côté serveur (ADR 0030) : analyse déterministe du parcours (graphe de prérequis validé),
// plan de révision rédigé par le Tuteur parmi les candidats, enregistré sous le rôle agent_tuteur pour
// l'élève connecté seulement ; inactivité et détresse signalées à un humain. Aucun contenu journalisé.

export const LONGUEUR_MESSAGE_MAX = 500;

function entier(nom: string, defaut: number): number {
  const v = Number(process.env[nom]);
  return Number.isInteger(v) && v > 0 ? v : defaut;
}

export function parametresTuteur(): ParametresModele {
  const effort = process.env.EFFORT_TUTEUR ?? "medium";
  return {
    modele: process.env.MODELE_TUTEUR ?? "claude-opus-5-5",
    effort: (["low", "medium", "high", "xhigh", "max"].includes(effort)
      ? effort
      : "medium") as ParametresModele["effort"],
    maxTokens: entier("MAX_JETONS_TUTEUR", 8000),
  };
}

export interface Preferences {
  minutesParJour: number | null;
  connexion: "lente" | "moyenne" | "bonne" | null;
  rappelsActifs: boolean;
  frequenceRappels: "quotidienne" | "hebdomadaire";
}

export interface PrioriteEnregistree {
  chapitreId: string;
  titre: string;
  unite: string;
  chapitreCode: string | null;
  raison: string;
  minutes: number;
}

export interface PlanEleve {
  preferences: Preferences;
  dernier: null | { priorites: PrioriteEnregistree[]; message: string; creeLe: string };
}

export function planDeLEleve(eleve: string): Promise<PlanEleve> {
  return avecUtilisateur(eleve, async (client) => {
    const p = (
      await client.query(
        `select minutes_par_jour as "minutesParJour", connexion, rappels_actifs as "rappelsActifs",
           frequence_rappels as "frequenceRappels" from preferences_eleves where eleve_id = $1`,
        [eleve],
      )
    ).rows[0];
    const r = (
      await client.query(
        `select priorites, message, cree_le as "creeLe" from recommandations_tuteur
         where eleve_id = $1 order by cree_le desc limit 1`,
        [eleve],
      )
    ).rows[0];
    return {
      preferences: p ?? {
        minutesParJour: null,
        connexion: null,
        rappelsActifs: false,
        frequenceRappels: "hebdomadaire",
      },
      dernier: r ?? null,
    };
  });
}

export async function enregistrerPreferences(
  eleve: string,
  p: Preferences,
): Promise<string | null> {
  if (
    p.minutesParJour !== null &&
    (!Number.isInteger(p.minutesParJour) || p.minutesParJour < 5 || p.minutesParJour > 240)
  )
    return "Temps par jour : entre 5 et 240 minutes.";
  if (p.connexion !== null && !["lente", "moyenne", "bonne"].includes(p.connexion))
    return "Connexion inconnue.";
  if (!["quotidienne", "hebdomadaire"].includes(p.frequenceRappels)) return "Fréquence inconnue.";
  await avecUtilisateur(eleve, (client) =>
    client.query(
      `insert into preferences_eleves (eleve_id, minutes_par_jour, connexion, rappels_actifs, frequence_rappels)
       values ($1, $2, $3, $4, $5)
       on conflict (eleve_id) do update set minutes_par_jour = excluded.minutes_par_jour,
         connexion = excluded.connexion, rappels_actifs = excluded.rappels_actifs,
         frequence_rappels = excluded.frequence_rappels, maj_le = now()`,
      [eleve, p.minutesParJour, p.connexion, p.rappelsActifs, p.frequenceRappels],
    ),
  );
  return null;
}

const MOTIFS: Record<PlanTuteur["signalement"], { motif: string; prefixe: string } | null> = {
  aucun: null,
  detresse: { motif: "detresse", prefixe: "Détresse" },
  decrochage: { motif: "autre", prefixe: "Décrochage" },
  situation_difficile: { motif: "autre", prefixe: "Situation difficile" },
};

/** Parcours de l'élève lu sous le rôle du Tuteur (seulement l'élève du contexte). */
async function parcours(eleve: string) {
  return avecAgentTuteur(eleve, async (client) => {
    const e = (
      await client.query(
        `select e.referentiel_id, n.ordre as niveau_ordre, e.niveau_id, e.serie_id, r.pays_code
         from eleves e join niveaux n on n.id = e.niveau_id join referentiels r on r.id = e.referentiel_id
         where e.id = $1 and e.statut = 'actif'`,
        [eleve],
      )
    ).rows[0];
    if (!e) return null;
    // Chapitres validés du référentiel de l'élève : ceux de sa classe (et série), et ceux des classes
    // inférieures (prérequis possibles), seulement dans des unités sans série ou de sa série (ADR 0047).
    const chapitres = (
      await client.query(
        `select c.id, c.titre, c.code, c.ordre, u.code as unite,
           (u.niveau_id = $2 and (not exists (select 1 from unites_series us where us.unite_id = u.id)
             or exists (select 1 from unites_series us where us.unite_id = u.id and us.serie_id = $3))) as de_sa_classe,
           p.statut, p.score::float as score_progression,
           (select t.score::float from tentatives_quiz t join quiz q on q.id = t.quiz_id
            where q.chapitre_id = c.id and t.eleve_id = $4 order by t.corrige_le desc limit 1) as score_quiz
         from chapitres c join unites u on u.id = c.unite_id join niveaux n on n.id = u.niveau_id
         left join progression p on p.chapitre_id = c.id and p.eleve_id = $4
         where u.referentiel_id = $1 and c.statut = 'valide' and n.ordre <= $5
           and (not exists (select 1 from unites_series us where us.unite_id = u.id)
                or exists (select 1 from unites_series us where us.unite_id = u.id and us.serie_id = $3))`,
        [e.referentiel_id, e.niveau_id, e.serie_id, eleve, e.niveau_ordre],
      )
    ).rows;
    const prerequis = (
      await client.query(
        "select chapitre_id, prerequis_id from prerequis_chapitres where statut = 'valide'",
      )
    ).rows;
    const jours = (await client.query("select jours_sans_activite() as j")).rows[0]?.j ?? 0;
    const preferences = (
      await client.query(
        "select minutes_par_jour, connexion from preferences_eleves where eleve_id = $1",
        [eleve],
      )
    ).rows[0];
    return { e, chapitres, prerequis, jours: Number(jours), preferences };
  });
}

export type ResultatPlan = { ok: true } | { ok: false; erreur: string };

export async function mettreAJourPlan(
  eleve: string,
  message: string | null,
): Promise<ResultatPlan> {
  if (!(await accesElevesOuvert()) || (await agentSuspendu("tuteur")))
    return { ok: false, erreur: MESSAGE_AGENT_SUSPENDU };
  if (message && message.length > LONGUEUR_MESSAGE_MAX)
    return { ok: false, erreur: `Message trop long (${LONGUEUR_MESSAGE_MAX} caractères au plus).` };
  // Quota pris avant l'appel au modèle et gardé même si la réponse est rejetée (revue de sécurité, S4).
  if (!(await prendreQuotaEleve(eleve, "plan_tuteur", entier("PLANS_PAR_JOUR", 3))))
    return {
      ok: false,
      erreur: "Tu as déjà mis ton plan à jour plusieurs fois aujourd'hui. Reviens demain.",
    };

  const donnees = await parcours(eleve);
  if (!donnees) return { ok: false, erreur: "Ton compte doit être actif." };
  const chapitres: (ChapitreParcours & { code: string })[] = donnees.chapitres.map((c) => ({
    id: c.id,
    titre: c.titre,
    code: c.code,
    unite: c.unite,
    ordre: c.ordre,
    deSaClasse: c.de_sa_classe,
    statut: c.statut,
    score: c.score_quiz ?? c.score_progression ?? null,
  }));
  const candidats = candidatsDeRevision(
    chapitres,
    donnees.prerequis.map((p) => ({ chapitreId: p.chapitre_id, prerequisId: p.prerequis_id })),
  );
  const preferences = {
    minutesParJour: donnees.preferences?.minutes_par_jour ?? null,
    connexion: donnees.preferences?.connexion ?? null,
  };
  const resultat = await genererPlan({
    systeme: composerPrompt({
      agent: "tuteur",
      codePays: donnees.e.pays_code,
      unite: "pays",
      skills: ["_commun/skills/contenu-non-fiable"],
      valeursDynamiques: {},
    }),
    demande: {
      candidats,
      preferences,
      joursSansActivite: donnees.jours,
      examen: null,
      message: message ?? undefined,
    },
    modele: modeleDesAgents("tuteur"),
    parametres: parametresTuteur(),
  });
  if (!resultat.sortie)
    return { ok: false, erreur: "Le plan n'a pas pu être préparé. Réessaie dans un moment." };
  const plan = resultat.sortie;
  if (controlerPlan(plan, candidats, preferences.minutesParJour).length > 0)
    return { ok: false, erreur: "Le plan proposé n'était pas conforme. Réessaie dans un moment." };

  const priorites: PrioriteEnregistree[] = plan.priorites.map((p) => {
    const c = candidats[p.candidat];
    return {
      chapitreId: c.chapitreId,
      titre: c.titre,
      unite: c.unite,
      chapitreCode: chapitres.find((x) => x.id === c.chapitreId)?.code ?? null,
      raison: p.raison,
      minutes: p.minutes,
    };
  });
  const signal = MOTIFS[plan.signalement];
  await avecAgentTuteur(eleve, async (client) => {
    await client.query(
      "insert into recommandations_tuteur (eleve_id, priorites, message) values ($1, $2, $3)",
      [
        eleve,
        JSON.stringify(priorites),
        [plan.message_eleve, plan.conseil_rythme].filter(Boolean).join("\n\n").slice(0, 2000),
      ],
    );
    if (signal)
      await client.query(
        `insert into signalements (source, motif, priorite, eleve_id, resume)
         values ('agent_tuteur', $1, 2, $2, $3)`,
        [
          signal.motif,
          eleve,
          `${signal.prefixe} : ${plan.motif_signalement || "à examiner"}`.slice(0, 2000),
        ],
      );
  });
  if (signal) await alerterVeilleSansAttendre();
  return { ok: true };
}

/**
 * Détection planifiée du décrochage : pour chaque élève inactif depuis TUTEUR_INACTIVITE_JOURS (14 par défaut),
 * un signalement à un humain et un message d'accueil bienveillant affiché à son retour (modèle de message,
 * sans modèle de langage). Renvoie le nombre d'élèves concernés.
 */
export async function detecterDecrochages(): Promise<number> {
  const jours = entier("TUTEUR_INACTIVITE_JOURS", 14);
  const inactifs = await avecAgentTuteur(null, (client) =>
    client.query("select eleve_id, jours from eleves_inactifs($1)", [jours]).then((r) => r.rows),
  );
  for (const { eleve_id, jours: j } of inactifs) {
    await avecAgentTuteur(eleve_id, async (client) => {
      await client.query(
        `insert into signalements (source, motif, priorite, eleve_id, resume)
         values ('agent_tuteur', 'autre', 2, $1, $2)`,
        [eleve_id, `Décrochage : ${j} jours sans activité.`],
      );
      await client.query(
        "insert into recommandations_tuteur (eleve_id, priorites, message) values ($1, '[]', $2)",
        [
          eleve_id,
          "Content de te revoir ! Pas besoin de tout rattraper d'un coup : commence par un chapitre court, à ton rythme. Mets ton plan à jour quand tu veux.",
        ],
      );
    });
  }
  return inactifs.length;
}
