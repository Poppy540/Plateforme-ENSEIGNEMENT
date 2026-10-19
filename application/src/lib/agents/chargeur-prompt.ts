// Composition du prompt système d'un agent (ADR 0005, 0006) :
//   prompt recopié du cadrage (agents/<agent>/prompt.md, sans la section des valeurs pilote)
//   + valeurs de l'unité tirées du pack pays + règles communes (§5.1) + skills de l'agent.
// Aucune valeur propre à un pays dans ce code : tout vient des fichiers.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export class ErreurConfigurationAgent extends Error {}

/** Racine du dépôt (dossiers agents/, referentiels/, docs/). */
export function racineDepot(): string {
  return process.env.CHEMIN_DEPOT ?? join(process.cwd(), "..");
}

/** Dossier du pack dont pays.yaml porte ce code (par exemple « ga »). */
export function dossierPack(racine: string, codePays: string): string {
  const base = join(racine, "referentiels");
  for (const nom of readdirSync(base)) {
    const fichier = join(base, nom, "pays.yaml");
    if (nom.startsWith("_") || !existsSync(fichier)) continue;
    const pays = parse(readFileSync(fichier, "utf8")) as { code?: string };
    if (pays?.code === codePays) return join(base, nom);
  }
  throw new ErreurConfigurationAgent(`Aucun pack pays pour le code « ${codePays} ».`);
}

/** Modèle de prompt : la section « VALEURS POUR L'UNITÉ PILOTE » est ignorée (les valeurs vivent dans le pack). */
export function lireModele(racine: string, agent: string): string {
  const texte = readFileSync(join(racine, "agents", agent, "prompt.md"), "utf8");
  const coupe = texte.search(/^# VALEURS POUR L'UNITÉ PILOTE/m);
  return (coupe >= 0 ? texte.slice(0, coupe) : texte).trimEnd();
}

export function lireValeurs(
  dossierDuPack: string,
  agent: string,
  unite: string,
): Record<string, string | null> {
  const fichier = join(dossierDuPack, "agents", agent, `${unite}.yaml`);
  if (!existsSync(fichier)) {
    throw new ErreurConfigurationAgent(
      `Pas de configuration de l'agent ${agent} pour l'unité ${unite}.`,
    );
  }
  const contenu = parse(readFileSync(fichier, "utf8")) as { variables?: Record<string, unknown> };
  return Object.fromEntries(
    Object.entries(contenu.variables ?? {}).map(([cle, valeur]) => [
      cle,
      valeur === null ? null : String(valeur),
    ]),
  );
}

/** Remplace les {{VARIABLES}} ; refuse toute variable manquante ou vide (unité non configurée). */
export function remplir(modele: string, valeurs: Record<string, string | null>): string {
  const manquantes = new Set<string>();
  const resultat = modele.replace(/\{\{([A-Z_]+)\}\}/g, (_tout, nom: string) => {
    const valeur = valeurs[nom];
    if (valeur === undefined || valeur === null || (valeur.trim() === "" && nom !== "SERIE")) {
      manquantes.add(nom);
      return "";
    }
    return valeur;
  });
  if (manquantes.size > 0) {
    throw new ErreurConfigurationAgent(
      `Variables non renseignées : ${[...manquantes].sort().join(", ")}.`,
    );
  }
  return resultat;
}

/** Règles communes à tous les agents (prompt maître, §5.1), recopiées telles quelles. */
export function lireReglesCommunes(racine: string): string {
  const texte = readFileSync(join(racine, "docs", "prompt-claude-code.md"), "utf8");
  const debut = texte.indexOf("## 5.1");
  const fin = texte.indexOf("## 5.2");
  if (debut < 0 || fin < 0)
    throw new ErreurConfigurationAgent("Règles communes (§5.1) introuvables.");
  return texte.slice(debut, fin).trim();
}

/** Corps d'une skill, sans en-tête YAML ni bloc « Source et licence » (la licence reste dans le dossier). */
export function lireSkill(racine: string, chemin: string): string {
  const texte = readFileSync(join(racine, "agents", chemin, "SKILL.md"), "utf8");
  const sansEntete = texte.replace(/^---\n[\s\S]*?\n---\n/, "");
  return sansEntete.replace(/^## Source et licence\n[\s\S]*?(?=^## )/m, "").trim();
}

export interface ConfigurationPrompt {
  agent: string;
  codePays: string;
  unite: string;
  skills: string[];
  /** Valeurs calculées à l'exécution (par exemple la liste des chapitres validés). */
  valeursDynamiques: Record<string, string>;
}

export function composerPrompt(config: ConfigurationPrompt, racine = racineDepot()): string {
  const pack = dossierPack(racine, config.codePays);
  const valeurs = { ...lireValeurs(pack, config.agent, config.unite), ...config.valeursDynamiques };
  const parties = [
    remplir(lireModele(racine, config.agent), valeurs),
    "# RÈGLES COMMUNES À TOUS LES AGENTS DE LA PLATEFORME\n" + lireReglesCommunes(racine),
    // Une skill peut citer les variables du prompt (par exemple {{RESPONSABLE}}) : mêmes valeurs.
    ...config.skills.map(
      (s) => `# SKILL : ${s.split("/").pop()}\n${remplir(lireSkill(racine, s), valeurs)}`,
    ),
  ];
  return parties.join("\n\n");
}
