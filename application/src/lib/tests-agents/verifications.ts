// Contrôles automatiques d'une exécution (en plus de l'évaluateur de type modèle de langage).
import type { AppelOutil } from "../agents/professeur/outils.ts";

export interface Verifications {
  outil_appele?: { nom: string; motif?: string };
  outil_non_appele?: string;
  ne_contient_pas?: string[];
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
export function controler(v: Verifications, reponses: string[], appels: AppelOutil[]): string[] {
  const echecs: string[] = [];
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
