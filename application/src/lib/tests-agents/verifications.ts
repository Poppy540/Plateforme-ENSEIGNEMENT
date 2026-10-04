// Contrôles automatiques d'une exécution (en plus de l'évaluateur de type modèle de langage).
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
