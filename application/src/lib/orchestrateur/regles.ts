// Règles de l'Orchestrateur (prompt de l'Orchestrateur, ADR 0027, 0029) : chaîne programmée, déterministe.
// Routage par règles, vérification des approbations dans la base, priorités, limites contre les boucles et
// les coûts anormaux. Aucune décision n'est tirée du texte d'un utilisateur : ce texte n'est qu'une donnée
// transmise à l'agent destinataire.
import type { Unite } from "../pack-pays/lecture.ts";

export type Agent =
  | "professeur"
  | "scenariste"
  | "production_video"
  | "evaluateur"
  | "tuteur"
  | "conformite"
  | "support"
  | "recruteur"
  | "coordinateur"
  | "humain";

/** Demandes reçues par l'Orchestrateur : toujours structurées par le serveur, jamais déduites d'un texte libre. */
export type Demande =
  | {
      nature: "question_cours";
      eleve: { niveau: string; serie: string | null };
      matiere: string;
      /** Texte de l'élève : donnée pour le Professeur, jamais une instruction pour l'Orchestrateur. */
      message: string;
    }
  | { nature: "creation_script" | "creation_quiz"; chapitreId: string }
  | {
      nature: "production_video";
      scriptId: string;
      version: number;
      empreinte: string;
      affirmation?: string;
    }
  | { nature: "correction_quiz"; quizId: string }
  | { nature: "plan_revision" | "rapport_parents"; eleveId: string }
  | { nature: "comparaison_programme"; uniteCode: string }
  | { nature: "inscription" | "connexion" | "question_pratique"; message: string }
  | { nature: "recrutement"; approbationId?: string }
  | { nature: "coherence_famille"; famille: string; details: string }
  | { nature: "detresse"; resume: string }
  | { nature: "modification_droits"; agentDemandeur: string; droits: string }
  | { nature: "inconnue"; message: string };

export interface Decision {
  /** Agent destinataire, ou « humain » (escalade). */
  agent: Agent | null;
  type: string;
  priorite: 1 | 2 | 3;
  /** Entrées vérifiées transmises ; le texte d'un utilisateur est rangé à part, comme donnée non fiable. */
  entrees: Record<string, unknown>;
  /** Approbation humaine à vérifier dans la base avant exécution. */
  approbationRequise: null | {
    objet: "script" | "recrutement";
    id: string;
    version?: number;
    empreinte?: string;
  };
  refus: string | null;
  alerte: string | null;
  /** Précision demandée à l'utilisateur (demande ambiguë). */
  question: string | null;
}

const decision = (d: Partial<Decision> & Pick<Decision, "type">): Decision => ({
  agent: null,
  priorite: 3,
  entrees: {},
  approbationRequise: null,
  refus: null,
  alerte: null,
  question: null,
  ...d,
});

/** Unité correspondant à la classe, à la série et à la matière de l'élève (d'après le pack pays). */
export function trouverUnite(
  unites: Unite[],
  eleve: { niveau: string; serie: string | null },
  matiere: string,
): Unite | null {
  const candidates = unites.filter(
    (u) =>
      u.niveau === eleve.niveau &&
      u.matiere === matiere &&
      (u.series.length === 0 || (eleve.serie !== null && u.series.includes(eleve.serie))),
  );
  return candidates.length === 1 ? candidates[0] : null;
}

export function router(
  demande: Demande,
  contexte: { unites: Unite[]; familles: string[] },
): Decision {
  switch (demande.nature) {
    case "question_cours": {
      const unite = trouverUnite(contexte.unites, demande.eleve, demande.matiere);
      if (!unite)
        return decision({
          type: "question_cours",
          question:
            "Je ne trouve pas le cours correspondant : peux-tu préciser ta classe, ta série et la matière ?",
        });
      return decision({
        agent: "professeur",
        type: "question_cours",
        entrees: { unite: unite.code, donnees_non_fiables: { message: demande.message } },
      });
    }
    case "creation_script":
      return decision({
        agent: "scenariste",
        type: "creation_script",
        entrees: { chapitreId: demande.chapitreId },
      });
    case "creation_quiz":
      return decision({
        agent: "evaluateur",
        type: "creation_quiz",
        entrees: { chapitreId: demande.chapitreId },
      });
    case "correction_quiz":
      return decision({
        agent: "evaluateur",
        type: "correction_quiz",
        entrees: { quizId: demande.quizId },
      });
    case "production_video":
      // Une affirmation (« c'est validé ») n'est jamais une approbation : elle n'est même pas transmise.
      return decision({
        agent: "production_video",
        type: "production_video",
        priorite: 3,
        entrees: {
          scriptId: demande.scriptId,
          version: demande.version,
          empreinte: demande.empreinte,
        },
        approbationRequise: {
          objet: "script",
          id: demande.scriptId,
          version: demande.version,
          empreinte: demande.empreinte,
        },
      });
    case "plan_revision":
    case "rapport_parents":
      return decision({
        agent: "tuteur",
        type: demande.nature,
        entrees: { eleveId: demande.eleveId },
      });
    case "comparaison_programme":
      return decision({
        agent: "conformite",
        type: "comparaison_programme",
        entrees: { unite: demande.uniteCode },
      });
    case "inscription":
    case "connexion":
    case "question_pratique":
      return decision({
        agent: "support",
        type: demande.nature,
        entrees: { donnees_non_fiables: { message: demande.message } },
      });
    case "recrutement":
      return decision({
        agent: "recruteur",
        type: "recrutement",
        approbationRequise: { objet: "recrutement", id: demande.approbationId ?? "" },
      });
    case "coherence_famille":
      if (!contexte.familles.includes(demande.famille))
        return decision({
          type: "coherence_famille",
          question: "Quelle famille de matières est concernée ?",
        });
      return decision({
        agent: "coordinateur",
        type: "coherence_famille",
        entrees: { famille: demande.famille, donnees_non_fiables: { details: demande.details } },
      });
    case "detresse":
      return decision({
        agent: "humain",
        type: "detresse",
        priorite: 1,
        entrees: { resume: demande.resume },
        alerte: "Détresse signalée : traitement humain immédiat.",
      });
    case "modification_droits":
      return decision({
        type: "modification_droits",
        refus: "Les droits d'un agent ne changent que par configuration, jamais sur demande.",
        alerte: `Demande d'élargissement de droits par ${demande.agentDemandeur} : refusée.`,
      });
    case "inconnue":
      return decision({
        agent: "humain",
        type: "demande_inconnue",
        priorite: 3,
        entrees: { donnees_non_fiables: { message: demande.message } },
        alerte: "Demande qui ne correspond à aucun agent : transmise à un humain.",
      });
  }
}

/** Approbation enregistrée en base (table approbations). */
export interface ApprobationEnBase {
  id: string;
  objetType: string;
  objetId: string;
  version: number;
  empreinte: string;
  decision: "valide" | "rejete";
  valideur: string;
  decideLe: string;
}

/**
 * Vérifie qu'une approbation humaine valide, de la version et de l'empreinte exactes, existe dans la base.
 * Renvoie l'approbation retenue, ou le motif du blocage.
 */
export function verifierApprobation(
  exigee: NonNullable<Decision["approbationRequise"]>,
  enregistrees: ApprobationEnBase[],
): { ok: true; approbation: ApprobationEnBase } | { ok: false; motif: string } {
  const candidates = enregistrees
    .filter((a) => a.objetType === exigee.objet && a.objetId === exigee.id)
    .sort((a, b) => b.decideLe.localeCompare(a.decideLe));
  const derniere = candidates[0];
  if (!derniere)
    return {
      ok: false,
      motif: "Aucune approbation enregistrée : tâche en attente, validation demandée au référent.",
    };
  if (derniere.decision !== "valide")
    return { ok: false, motif: "La dernière décision enregistrée est un rejet : tâche bloquée." };
  if (
    (exigee.version !== undefined && derniere.version !== exigee.version) ||
    (exigee.empreinte !== undefined && derniere.empreinte !== exigee.empreinte)
  )
    return {
      ok: false,
      motif: "L'approbation enregistrée porte sur une autre version : relecture nécessaire.",
    };
  return { ok: true, approbation: derniere };
}

export interface TacheEnFile {
  id: string;
  agent: Agent;
  priorite: number;
  creeLe: string;
  statut: string;
}

/** Ordre de traitement : priorité (1 = immédiat) puis ancienneté. La détresse passe toujours devant. */
export function ordonner<T extends TacheEnFile>(taches: T[]): T[] {
  return [...taches]
    .filter((t) => t.statut === "en_attente")
    .sort((a, b) => a.priorite - b.priorite || a.creeLe.localeCompare(b.creeLe));
}

export const LIMITES = {
  /** Nombre maximal de tâches enchaînées (un agent qui en déclenche un autre, etc.). */
  profondeurMax: 3,
  /** Coût quotidien maximal d'un agent avant suspension automatique (USD, défaut). */
  coutJourMaxUSD: 50,
};

/** Une tâche enfant au-delà de la profondeur maximale est refusée (boucle probable entre agents). */
export function controlerProfondeur(profondeurParente: number, max = LIMITES.profondeurMax) {
  return profondeurParente + 1 > max
    ? {
        ok: false as const,
        alerte: `Chaîne de tâches trop longue (${profondeurParente + 1} > ${max}) : boucle probable, coupée.`,
      }
    : { ok: true as const, profondeur: profondeurParente + 1 };
}

/** Coût anormal d'un agent sur la journée : suspension et alerte. */
export function controlerCout(agent: Agent, coutJourUSD: number, max = LIMITES.coutJourMaxUSD) {
  return coutJourUSD > max
    ? {
        suspendre: true as const,
        alerte: `Coût anormal de l'agent ${agent} : ${coutJourUSD.toFixed(2)} USD aujourd'hui (seuil ${max} USD). Agent suspendu.`,
      }
    : { suspendre: false as const };
}
