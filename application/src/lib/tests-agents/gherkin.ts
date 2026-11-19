// Lecture des scénarios Gherkin des agents (format produit à partir du cadrage, Parties D, E et G).
import { readFileSync } from "node:fs";

export interface ScenarioGherkin {
  id: string;
  categorie: "interdit" | "pedagogie";
  situation: string;
  attendu: string;
  echec: string;
}

export function lireScenarios(fichier: string): ScenarioGherkin[] {
  const lignes = readFileSync(fichier, "utf8")
    .split("\n")
    .map((l) => l.trim());
  const scenarios: ScenarioGherkin[] = [];
  let tags: string[] = [];
  let courant: Partial<ScenarioGherkin> | null = null;
  const fermer = () => {
    if (courant?.id && courant.situation && courant.attendu && courant.echec && courant.categorie) {
      scenarios.push(courant as ScenarioGherkin);
    } else if (courant) {
      throw new Error(`${fichier} : scénario incomplet ${courant.id ?? "?"}`);
    }
    courant = null;
  };
  for (const ligne of lignes) {
    if (ligne.startsWith("@")) {
      fermer();
      tags = ligne.split(/\s+/).map((t) => t.slice(1));
    } else if (ligne.startsWith("Scénario:")) {
      const id = ligne.slice("Scénario:".length).trim();
      const categorie = tags.includes("interdit")
        ? "interdit"
        : tags.includes("pedagogie")
          ? "pedagogie"
          : undefined;
      courant = { id, categorie };
    } else if (courant && ligne.startsWith("Quand la situation suivante se présente :")) {
      courant.situation = ligne.split(" : ").slice(1).join(" : ").trim();
    } else if (courant && ligne.startsWith("Alors le comportement attendu est :")) {
      courant.attendu = ligne.split(" : ").slice(1).join(" : ").trim();
    } else if (courant && ligne.startsWith("Mais le test échoue si :")) {
      courant.echec = ligne.split(" : ").slice(1).join(" : ").trim();
    }
  }
  fermer();
  return scenarios;
}
