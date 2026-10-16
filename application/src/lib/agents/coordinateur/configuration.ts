// Configuration du Coordinateur (ADR 0038) : skills communes (agents/coordinateur/skills) et skill propre à la
// famille, désignée par le pack pays (agents/coordinateur/<famille>.yaml, clé skill_famille).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export const SKILLS_COMMUNES_COORDINATEUR = [
  "alignement-objectifs-evaluation",
  "analyse-items-erreurs",
  "briefing-referent",
  "cartographie-curriculaire-verticale",
  "coherence-terminologique",
  "comparaison-referentiels-pays",
  "graphe-prerequis",
  "planification-production",
  "progression-d-apprentissage",
  "revue-qualite-contenu",
  "socle-et-extensions",
];

/** Chemins des skills à charger pour l'instance de cette famille. */
export function skillsCoordinateur(dossierDuPack: string, famille: string): string[] {
  const fichier = join(dossierDuPack, "agents", "coordinateur", `${famille}.yaml`);
  const v = existsSync(fichier)
    ? (parse(readFileSync(fichier, "utf8")) as { skill_famille?: unknown }).skill_famille
    : null;
  const propre = typeof v === "string" && /^[a-z0-9-]+$/.test(v) ? [v] : [];
  return [
    "_commun/skills/contenu-non-fiable",
    ...[...SKILLS_COMMUNES_COORDINATEUR, ...propre].map((s) => `coordinateur/skills/${s}`),
  ];
}
