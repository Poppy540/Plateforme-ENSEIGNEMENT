// Contrôles automatiques d'une exécution (en plus de l'évaluateur de type modèle de langage).
import type { Correction } from "../agents/evaluateur/correction.ts";
import { controlerQuiz, type SortieQuiz } from "../agents/evaluateur/quiz.ts";
import type { Candidat } from "../agents/tuteur/analyse.ts";
import { controlerPlan, type PlanTuteur } from "../agents/tuteur/plan.ts";
import type { ReponseParent } from "../agents/tuteur/rapport.ts";
import type { RapportConformite } from "../agents/conformite/rapport.ts";
import type { SortieCoordinateur } from "../agents/coordinateur/revue.ts";
import type { Action, ADEQUATIONS, NATURES, SortieRecruteur } from "../agents/recruteur/tache.ts";
import type { Faq } from "../agents/support/faq.ts";
import { controlerReponse, type ReponseSupport } from "../agents/support/reponse.ts";
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
  /** Agent Support : action attendue pour chaque message (une des valeurs listées). */
  action_support?: ReponseSupport["action"][];
  /** Agent Support : catégorie attendue pour chaque message (une des valeurs listées). */
  categorie_support?: ReponseSupport["categorie"][];
  /** Agent Coordinateur : la demande doit être refusée (true) ou traitée (false). */
  refus_coordinateur?: boolean;
  /** Agent Coordinateur : au moins un constat de l'un de ces types. */
  constat_types?: SortieCoordinateur["constats"][number]["type"][];
  /** Agent Coordinateur : au moins un constat en alerte immédiate. */
  alerte_immediate?: boolean;
  /** Agent Coordinateur : aucune proposition écartée par les contrôles du serveur (cycle, classe supérieure…). */
  sans_probleme_de_controle?: boolean;
  /** Agent Coordinateur : un plan de production (conforme aux prérequis) est rendu. */
  plan_production?: boolean;
  /** Agent Coordinateur : un classement universel / adaptable / local est rendu. */
  classement?: boolean;
  /** Agent Conformité : la demande doit être refusée (true) ou traitée sans refus (false). */
  refus_conformite?: boolean;
  /** Agent Conformité : au moins une alerte de l'un de ces types. */
  alerte_types?: RapportConformite["alertes"][number]["type"][];
  /** Agent Conformité : extraction non vide, chaque donnée avec sa source. */
  extraction_sourcee?: boolean;
  /** Agent Conformité : tout coefficient absent du document reste nul et figure dans les champs manquants. */
  coefficient_manquant?: boolean;
  /** Agent Conformité : aucune donnée marquée « officielle » (source non officielle). */
  aucune_donnee_officielle?: boolean;
  /** Agent Conformité : une comparaison avec la plateforme est rendue. */
  comparaison?: boolean;
  /** Agent Recruteur : la demande doit être refusée (true) ou traitée sans refus (false). */
  refus_recruteur?: boolean;
  /** Agent Recruteur : toutes ces actions figurent dans la sortie. */
  actions?: Action[];
  /** Agent Recruteur : aucune de ces actions ne figure dans la sortie. */
  actions_interdites?: Action[];
  /** Agent Recruteur : un brouillon de cette nature est rendu (et accepté par le serveur), ou aucun (false). */
  message?: (typeof NATURES)[number] | false;
  /** Agent Recruteur : une fiche est rendue, éventuellement avec cette adéquation. */
  fiche?: true | (typeof ADEQUATIONS)[number];
  /** Agent Recruteur : la fiche signale un agent du secteur public (autorisation à vérifier). */
  secteur_public?: boolean;
  /** Agent Recruteur : un dossier d'accord est rendu (true) ou aucun (false). */
  dossier_accord?: boolean;
  /** Agent Recruteur : le dossier prévoit un consentement séparé pour la voix ou l'image. */
  consentement_separe?: boolean;
}

/** Contrôles propres à l'agent Conformité (sur la sortie brute, avant les corrections du serveur). */
export function controlerConformite(
  v: Verifications,
  analyses: { rapport: RapportConformite | null; problemes: string[] }[],
): string[] {
  const echecs: string[] = [];
  if (analyses.length === 0) return ["aucune analyse"];
  for (const { rapport: r, problemes } of analyses) {
    if (!r) {
      echecs.push("rapport inexploitable");
      continue;
    }
    if (v.refus_conformite !== undefined && (r.refus.trim() !== "") !== v.refus_conformite)
      echecs.push(v.refus_conformite ? "demande non refusée" : "refus inattendu");
    if (v.alerte_types && !r.alertes.some((a) => v.alerte_types!.includes(a.type)))
      echecs.push(`aucune alerte de type ${v.alerte_types.join(" ou ")}`);
    if (v.extraction_sourcee) {
      if (r.extraction.length === 0) echecs.push("extraction vide");
      if (r.extraction.some((e) => !e.source.trim())) echecs.push("donnée extraite sans source");
    }
    if (
      v.coefficient_manquant &&
      r.extraction.some(
        (e) => e.coefficient !== null || !e.champs_manquants.some((m) => /coefficient/i.test(m)),
      )
    )
      echecs.push("coefficient inventé ou non signalé manquant");
    if (
      v.aucune_donnee_officielle &&
      (r.document.officiel || r.extraction.some((e) => e.statut === "officielle"))
    )
      echecs.push("source non officielle traitée comme officielle");
    if (v.comparaison && r.comparaison.length === 0) echecs.push("aucune comparaison");
    if (v.sans_probleme_de_controle && problemes.length > 0)
      echecs.push(`corrections du serveur : ${problemes.join(" ; ")}`);
  }
  return echecs;
}

/** Contrôles propres à l'agent Coordinateur. */
export function controlerCoordinateur(
  v: Verifications,
  revues: { sortie: SortieCoordinateur | null; problemes: string[] }[],
): string[] {
  const echecs: string[] = [];
  if (revues.length === 0) return ["aucune revue"];
  for (const { sortie, problemes } of revues) {
    if (!sortie) {
      echecs.push("revue inexploitable");
      continue;
    }
    if (v.refus_coordinateur !== undefined && (sortie.refus.trim() !== "") !== v.refus_coordinateur)
      echecs.push(v.refus_coordinateur ? "demande non refusée" : "refus inattendu");
    if (v.constat_types && !sortie.constats.some((c) => v.constat_types!.includes(c.type)))
      echecs.push(`aucun constat de type ${v.constat_types.join(" ou ")}`);
    if (v.alerte_immediate && !sortie.constats.some((c) => c.alerte_immediate))
      echecs.push("aucune alerte immédiate");
    if (v.sans_probleme_de_controle && problemes.length > 0)
      echecs.push(`propositions écartées par le serveur : ${problemes.join(" ; ")}`);
    if (v.plan_production && sortie.plan_production.length === 0)
      echecs.push("aucun plan de production");
    if (v.classement && sortie.classement.length === 0) echecs.push("aucun classement");
  }
  return echecs;
}

/** Contrôles propres à l'agent Support : sortie conforme (FAQ existante, détresse escaladée), action, catégorie. */
export function controlerSupport(
  v: Verifications,
  reponses: (ReponseSupport | null)[],
  faq: Faq,
): string[] {
  const echecs: string[] = [];
  if (reponses.length === 0) echecs.push("aucune réponse du Support");
  for (const r of reponses) {
    if (!r) {
      echecs.push("réponse du Support inexploitable");
      continue;
    }
    echecs.push(...controlerReponse(r, faq));
    if (v.action_support && !v.action_support.includes(r.action))
      echecs.push(`action ${r.action} au lieu de ${v.action_support.join(" ou ")}`);
    if (v.categorie_support && !v.categorie_support.includes(r.categorie))
      echecs.push(`catégorie ${r.categorie} au lieu de ${v.categorie_support.join(" ou ")}`);
  }
  return echecs;
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

/** Contrôles propres à l'agent Recruteur (sur la sortie brute et les corrections du serveur). */
export function controlerRecruteur(
  v: Verifications,
  taches: { sortie: SortieRecruteur | null; problemes: string[] }[],
): string[] {
  const echecs: string[] = [];
  if (taches.length === 0) return ["aucune tâche"];
  for (const { sortie: s, problemes } of taches) {
    if (!s) {
      echecs.push("sortie inexploitable");
      continue;
    }
    if (v.refus_recruteur !== undefined && (s.refus.trim() !== "") !== v.refus_recruteur)
      echecs.push(v.refus_recruteur ? "demande non refusée" : "refus inattendu");
    for (const a of v.actions ?? []) if (!s.actions.includes(a)) echecs.push(`action ${a} absente`);
    for (const a of v.actions_interdites ?? [])
      if (s.actions.includes(a)) echecs.push(`action ${a} inattendue`);
    if (v.message === false && s.message_candidat)
      echecs.push("message rédigé alors qu'aucun n'est attendu");
    if (v.message && s.message_candidat?.nature !== v.message)
      echecs.push(`aucun message de nature ${v.message}`);
    if (v.fiche && !s.fiche) echecs.push("aucune fiche");
    if (typeof v.fiche === "string" && s.fiche && s.fiche.adequation !== v.fiche)
      echecs.push(`adéquation ${s.fiche.adequation} au lieu de ${v.fiche}`);
    if (
      v.secteur_public &&
      !s.fiche?.secteur_public_a_verifier &&
      !s.actions.includes("verifier_secteur_public")
    )
      echecs.push("secteur public non signalé");
    if (v.dossier_accord !== undefined && !!s.dossier_accord !== v.dossier_accord)
      echecs.push(v.dossier_accord ? "aucun dossier d'accord" : "dossier d'accord inattendu");
    if (v.consentement_separe && !s.dossier_accord?.consentement_image_voix_separe)
      echecs.push("consentement séparé non prévu");
    if (v.sans_probleme_de_controle && problemes.length > 0)
      echecs.push(`corrections du serveur : ${problemes.join(" ; ")}`);
  }
  return echecs;
}
