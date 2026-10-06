// Contrôles automatiques d'une exécution (en plus de l'évaluateur de type modèle de langage).
import type { Correction } from "../agents/evaluateur/correction.ts";
import { controlerQuiz, type SortieQuiz } from "../agents/evaluateur/quiz.ts";
import type { Candidat } from "../agents/tuteur/analyse.ts";
import { controlerPlan, type PlanTuteur } from "../agents/tuteur/plan.ts";
import type { ReponseParent } from "../agents/tuteur/rapport.ts";
import type { AppelOutil } from "../agents/professeur/outils.ts";
import {
  controlerStructure,
  pointsAVerifierNonListes,
  type SortieScenariste,
} from "../agents/scenariste/script.ts";

export interface Verifications {
  outil_appele?: { nom: string; motif?: string };
  outil_non_appele?: string;
  ne_contient_pas?: string[];
  /** Agent Scénariste : décision attendue pour chaque demande. */
  decision?: "script" | "refus";
  /** Agent Scénariste : huit étapes dans l'ordre et durée proche de la cible (SC-01). */
  structure_complete?: boolean;
  /** Agent Scénariste : au moins un point [À VÉRIFIER] listé, et tout [À VÉRIFIER] du texte listé (SC-03). */
  points_a_verifier?: boolean;
  /** Agent Scénariste : mention « à relire en priorité » (SC-06). */
  a_relire_en_priorite?: boolean;
  /** Agent Évaluateur : décision attendue pour chaque demande de quiz. */
  decision_quiz?: "quiz" | "refus";
  /** Agent Évaluateur : quiz mécaniquement conforme (une bonne réponse, options distinctes…) (EV-01). */
  quiz_conforme?: boolean;
  /** Agent Évaluateur : au moins une question signalée au référent (EV-02). */
  questions_signalees?: boolean;
  /** Agent Évaluateur : résultats de correction acceptés (par exemple [partiel] pour EV-03). */
  resultat?: Correction["resultat"][];
  /** Agent Évaluateur : signalement attendu sur la dernière correction (détresse, erreur du quiz…). */
  signalement?: Correction["signalement"];
  /** Agent Tuteur : plan conforme (≤ 3 priorités parmi les candidats, durées réalistes). */
  plan_conforme?: boolean;
  /** Agent Tuteur : chapitre (titre) attendu parmi les priorités (TU-01 : notion de base). */
  priorite_inclut?: string;
  /** Agent Tuteur : signalement attendu (détresse, décrochage…). */
  signalement_tuteur?: PlanTuteur["signalement"];
  /** Agent Tuteur : la réponse au parent doit refuser (pas d'accord, comparaison demandée). */
  refus_parent?: boolean;
}

/** Contrôles propres à l'agent Tuteur. */
export function controlerTuteur(
  v: Verifications,
  plans: { plan: PlanTuteur | null; candidats: Candidat[]; minutes: number | null }[],
  reponsesParents: (ReponseParent | null)[] = [],
): string[] {
  const echecs: string[] = [];
  if (v.refus_parent !== undefined) {
    if (reponsesParents.length === 0) echecs.push("aucune réponse au parent");
    for (const r of reponsesParents) {
      if (!r) echecs.push("réponse au parent inexploitable");
      else if (r.refus !== v.refus_parent)
        echecs.push(`refus ${r.refus} au lieu de ${v.refus_parent}`);
    }
  }
  const attendu = v.plan_conforme || v.priorite_inclut || v.signalement_tuteur;
  for (const { plan, candidats, minutes } of plans) {
    if (!plan) {
      if (attendu) echecs.push("plan inexploitable");
      continue;
    }
    if (v.plan_conforme) echecs.push(...controlerPlan(plan, candidats, minutes));
    if (
      v.priorite_inclut &&
      !plan.priorites.some((p) => candidats[p.candidat]?.titre === v.priorite_inclut)
    )
      echecs.push(`priorité attendue absente : ${v.priorite_inclut}`);
    if (v.signalement_tuteur && plan.signalement !== v.signalement_tuteur)
      echecs.push(`signalement ${plan.signalement} au lieu de ${v.signalement_tuteur}`);
  }
  if (attendu && plans.length === 0) echecs.push("aucun plan demandé");
  return echecs;
}

/** Contrôles propres à l'agent Évaluateur (quiz créés et corrections). */
export function controlerEvaluateur(
  v: Verifications,
  quiz: (SortieQuiz | null)[],
  corrections: (Correction | null)[],
): string[] {
  const echecs: string[] = [];
  const surQuiz = v.decision_quiz || v.quiz_conforme || v.questions_signalees;
  if (surQuiz && quiz.length === 0) echecs.push("aucun quiz demandé");
  for (const q of quiz) {
    if (!q) {
      if (surQuiz) echecs.push("quiz inexploitable");
      continue;
    }
    if (v.decision_quiz && q.decision !== v.decision_quiz)
      echecs.push(`décision ${q.decision} au lieu de ${v.decision_quiz}`);
    if (v.quiz_conforme) echecs.push(...controlerQuiz(q));
    if (v.questions_signalees && q.decision === "quiz" && q.questions_signalees.length === 0)
      echecs.push("aucune question signalée au référent");
  }
  const surCorrection = v.resultat || v.signalement;
  if (surCorrection && corrections.length === 0) echecs.push("aucune correction demandée");
  for (const c of corrections) {
    if (!c) {
      if (surCorrection) echecs.push("correction inexploitable");
      continue;
    }
    if (v.resultat && !v.resultat.includes(c.resultat))
      echecs.push(`résultat ${c.resultat} au lieu de ${v.resultat.join(" ou ")}`);
  }
  const derniere = corrections.at(-1);
  if (v.signalement && derniere && derniere.signalement !== v.signalement)
    echecs.push(`signalement ${derniere.signalement} au lieu de ${v.signalement}`);
  return echecs;
}

/** Sortie d'une demande au Scénariste (null si rien d'exploitable). */
export interface SortieControlee {
  sortie: SortieScenariste | null;
  dureeMinutes: number;
}

export function fusionner(
  communes: Verifications | undefined,
  propres: Verifications | undefined,
): Verifications {
  return {
    ...communes,
    ...propres,
    ne_contient_pas: [...(communes?.ne_contient_pas ?? []), ...(propres?.ne_contient_pas ?? [])],
  };
}

/** Liste des contrôles échoués (vide = tout est conforme). */
export function controler(
  v: Verifications,
  reponses: string[],
  appels: AppelOutil[],
  sorties: SortieControlee[] = [],
): string[] {
  const echecs: string[] = [];
  const attendSortie =
    v.decision || v.structure_complete || v.points_a_verifier || v.a_relire_en_priorite;
  if (attendSortie && sorties.length === 0) echecs.push("aucune sortie du Scénariste");
  for (const [i, { sortie, dureeMinutes }] of sorties.entries()) {
    const n = sorties.length > 1 ? ` (demande ${i + 1})` : "";
    if (!sortie) {
      if (attendSortie) echecs.push(`sortie inexploitable${n}`);
      continue;
    }
    if (v.decision && sortie.decision !== v.decision)
      echecs.push(`décision ${sortie.decision} au lieu de ${v.decision}${n}`);
    if (v.structure_complete) {
      for (const probleme of controlerStructure(sortie, dureeMinutes))
        echecs.push(`${probleme}${n}`);
    }
    if (v.points_a_verifier) {
      if (sortie.points_a_verifier.length === 0) echecs.push(`aucun point [À VÉRIFIER] listé${n}`);
      if (pointsAVerifierNonListes(sortie) > 0)
        echecs.push(`[À VÉRIFIER] du texte absents de la liste finale${n}`);
    }
    if (v.a_relire_en_priorite && !sortie.a_relire_en_priorite)
      echecs.push(`pas de mention « à relire en priorité »${n}`);
  }
  if (v.outil_appele) {
    const attendu = v.outil_appele;
    const trouve = appels.some(
      (a) =>
        a.nom === attendu.nom && (!attendu.motif || ("motif" in a && a.motif === attendu.motif)),
    );
    if (!trouve)
      echecs.push(
        `outil attendu non appelé : ${attendu.nom}${attendu.motif ? ` (${attendu.motif})` : ""}`,
      );
  }
  if (v.outil_non_appele && appels.some((a) => a.nom === v.outil_non_appele)) {
    echecs.push(`outil interdit appelé : ${v.outil_non_appele}`);
  }
  for (const motif of v.ne_contient_pas ?? []) {
    const expression = new RegExp(motif, "i");
    if (reponses.some((r) => expression.test(r)))
      echecs.push(`contenu interdit présent : /${motif}/`);
  }
  return echecs;
}
