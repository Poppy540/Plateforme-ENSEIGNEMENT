import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { parse } from "yaml";
import { AGENTS_PAR_UNITE, reglagesAgentsManquants } from "./agents-des-unites.ts";
import { ErreurPack, libellesFamilles, lirePack, type PackPays } from "./lecture.ts";

// Vérification d'un pack pays (Jalon 22, étape 3 ; ADR 0113) : `pnpm pack:verifier <dossier>`. Dit, fichier par
// fichier, ce qui empêche l'import (bloquant), ce qui manque pour que la plateforme serve vraiment ce pays (à
// compléter) et ce qui attend une validation humaine (à valider). Lecture seule ; aucune règle propre à un pays.

export type Niveau = "bloquant" | "a_completer" | "a_valider";

export interface Constat {
  niveau: Niveau;
  fichier: string;
  message: string;
}

export interface RapportPack {
  pays: string | null;
  constats: Constat[];
}

/** Agents réglés une fois pour tout le pays (`agents/<agent>/pays.yaml`). */
export const AGENTS_PAR_PAYS = ["tuteur", "support", "conformite", "recruteur"] as const;

type Brut = Record<string, unknown>;

function lire(chemin: string): Brut | null {
  try {
    return (parse(readFileSync(chemin, "utf8")) ?? {}) as Brut;
  } catch {
    return null;
  }
}

function fichiersYaml(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return nom === "sources" ? [] : fichiersYaml(chemin);
    return nom.endsWith(".yaml") ? [chemin] : [];
  });
}

/** Variables attendues par un gabarit (`gabarits/agents/<agent>.yaml`). */
function variablesDuGabarit(gabarits: string, agent: string): string[] {
  const brut = lire(join(gabarits, "agents", `${agent}.yaml`));
  return Object.keys((brut?.variables ?? {}) as Brut);
}

export function verifierPack(dossier: string, gabarits: string): RapportPack {
  const constats: Constat[] = [];
  const noter = (niveau: Niveau, fichier: string, message: string) =>
    constats.push({ niveau, fichier, message });

  // 1. Chaque fichier se lit, et le modèle a bien été adapté.
  for (const chemin of fichiersYaml(dossier)) {
    const fichier = relative(dossier, chemin);
    if (/\{\{(CODE|NOM)_PAYS\}\}/.test(readFileSync(chemin, "utf8")))
      noter("bloquant", fichier, "modèle copié à la main : créez le pack avec `pnpm pack:nouveau`");
    else if (lire(chemin) === null) noter("bloquant", fichier, "YAML illisible");
  }

  // 2. Cohérence du pack (mêmes contrôles que l'import).
  let pack: PackPays | null = null;
  try {
    pack = lirePack(dossier);
  } catch (e) {
    if (!(e instanceof ErreurPack)) throw e;
    for (const erreur of e.erreurs) {
      const [avant, ...reste] = erreur.split(" : ");
      const estFichier = /\.yaml$/.test(avant) && reste.length > 0;
      noter("bloquant", estFichier ? avant : "—", estFichier ? reste.join(" : ") : erreur);
    }
  }

  if (pack) verifierContenu(dossier, gabarits, pack, noter);
  else
    noter(
      "a_completer",
      "—",
      "contrôles détaillés (agents, programmes, FAQ, durées…) dès que les points bloquants sont corrigés",
    );
  verifierSources(dossier, noter);
  return {
    pays: pack?.pays.code ?? null,
    constats,
  };
}

function verifierContenu(
  dossier: string,
  gabarits: string,
  pack: PackPays,
  noter: (niveau: Niveau, fichier: string, message: string) => void,
) {
  // Pays.
  if (pack.pays.indicatifsTelephone.length === 0)
    noter(
      "a_completer",
      "pays.yaml",
      "aucun indicatif téléphonique : personne ne peut se connecter",
    );
  if (pack.pays.ageMajorite === null)
    noter(
      "a_valider",
      "pays.yaml",
      "âge de la majorité inconnu : tout élève est traité comme mineur",
    );
  const durees = Object.entries(pack.pays.conservation).filter(([, v]) => v === null);
  if (durees.length > 0)
    noter(
      "a_valider",
      "pays.yaml",
      `durées de conservation non fixées (rien n'est effacé) : ${durees.map(([c]) => c).join(", ")}`,
    );
  const seuils = Object.entries(pack.pays.pilote).filter(([, v]) => v === null);
  if (seuils.length > 0)
    noter(
      "a_valider",
      "pays.yaml",
      `seuils du pilote non fixés (critères non surveillés) : ${seuils.map(([c]) => c).join(", ")}`,
    );

  // Unités et programmes.
  if (pack.unites.length === 0) noter("a_completer", "unites.yaml", "aucune unité");
  const sansProgramme = pack.unites.filter((u) => !pack.programmes[u.code]);
  if (pack.unites.length > 0 && sansProgramme.length === pack.unites.length)
    noter("a_completer", "programmes/", "aucun programme : aucun cours ne peut être proposé");
  else if (sansProgramme.length > 0)
    noter(
      "a_completer",
      "programmes/",
      `${sansProgramme.length} unité(s) sur ${pack.unites.length} sans programme (affichées « Bientôt disponible »)`,
    );
  const aValider = Object.keys(pack.programmes).filter(
    (u) => lire(join(dossier, "programmes", `${u}.yaml`))?.statut !== "valide",
  );
  if (aValider.length > 0)
    noter(
      "a_valider",
      "programmes/",
      `${aValider.length} programme(s) à valider par un enseignant-référent`,
    );

  // Agents par unité.
  for (const manquant of reglagesAgentsManquants(dossier, pack)) {
    const agent = manquant.split("/")[1];
    noter(
      "bloquant",
      manquant,
      `réglages manquants pour une unité qui a un programme : copier _modele/gabarits/agents/${agent}.yaml`,
    );
  }
  for (const unite of Object.keys(pack.programmes))
    for (const agent of AGENTS_PAR_UNITE)
      verifierVariables(dossier, gabarits, agent, `agents/${agent}/${unite}.yaml`, noter);

  // Agents du pays et des familles.
  for (const agent of AGENTS_PAR_PAYS) {
    const fichier = `agents/${agent}/pays.yaml`;
    if (!existsSync(join(dossier, fichier)))
      noter(
        "a_completer",
        fichier,
        `manquant : l'agent ne travaille pas pour ce pays (copier _modele/gabarits/agents/${agent}.yaml)`,
      );
    else verifierVariables(dossier, gabarits, agent, fichier, noter);
  }
  const familles = Object.keys(libellesFamilles(dossier));
  if (familles.length === 0) noter("a_completer", "familles.yaml", "aucune famille de matières");
  for (const famille of familles) {
    const fichier = `agents/coordinateur/${famille}.yaml`;
    if (!existsSync(join(dossier, fichier)))
      noter(
        "a_completer",
        fichier,
        "manquant : pas de Coordinateur pour cette famille (copier _modele/gabarits/agents/coordinateur.yaml)",
      );
    else verifierVariables(dossier, gabarits, "coordinateur", fichier, noter);
  }

  // FAQ, questionnaire, recrutement.
  const faq = existsSync(join(dossier, "faq.yaml")) ? lire(join(dossier, "faq.yaml")) : null;
  const entrees = Array.isArray(faq?.entrees) ? faq.entrees.length : 0;
  if (entrees === 0)
    noter("a_completer", "faq.yaml", "aucune entrée : le Support n'aura rien à répondre");
  else if (faq?.statut !== "valide")
    noter("a_valider", "faq.yaml", `${entrees} entrée(s) à relire avant d'être servies`);
  const questionnaire = lire(join(dossier, "questionnaire.yaml"));
  if (
    Array.isArray(questionnaire?.questions) &&
    questionnaire.questions.length > 0 &&
    questionnaire.statut !== "valide"
  )
    noter("a_valider", "questionnaire.yaml", "questionnaire à relire : montré à personne d'ici là");
  const recrutement = lire(join(dossier, "recrutement.yaml"));
  if (recrutement && recrutement.statut !== "valide")
    noter("a_valider", "recrutement.yaml", "recrutement à valider (et avis d'un juriste local)");
}

function verifierVariables(
  dossier: string,
  gabarits: string,
  agent: string,
  fichier: string,
  noter: (niveau: Niveau, fichier: string, message: string) => void,
) {
  const brut = lire(join(dossier, fichier));
  if (!brut) return; // absent ou illisible : déjà signalé
  if (agent === "production-video") {
    const fiche = (brut.fiche_avatar ?? {}) as Brut;
    const vides = ["avatar", "voix", "langue"].filter((c) => !String(fiche[c] ?? "").trim());
    if (vides.length > 0)
      noter("a_completer", fichier, `fiche d'avatar incomplète : ${vides.join(", ")}`);
    return;
  }
  const valeurs = (brut.variables ?? {}) as Brut;
  const vides = variablesDuGabarit(gabarits, agent).filter(
    (v) =>
      v !== "SERIE" &&
      (valeurs[v] === undefined || valeurs[v] === null || !String(valeurs[v]).trim()),
  );
  if (vides.length > 0)
    noter(
      "a_completer",
      fichier,
      `variables vides (l'agent refusera de travailler) : ${vides.join(", ")}`,
    );
}

function verifierSources(
  dossier: string,
  noter: (niveau: Niveau, fichier: string, message: string) => void,
) {
  const chemin = join(dossier, "SOURCES.md");
  if (!existsSync(chemin)) {
    noter(
      "a_completer",
      "SOURCES.md",
      "manquant : chaque donnée doit avoir son origine et son statut",
    );
    return;
  }
  const texte = readFileSync(chemin, "utf8");
  for (const fichier of readdirSync(dossier).filter((n) => n.endsWith(".yaml")))
    if (!texte.includes(`\`${fichier}\``))
      noter("a_completer", "SOURCES.md", `aucune ligne pour \`${basename(fichier)}\``);
  const lignes = texte.split("\n").filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l));
  const statut = (l: string) => l.split("|").filter(Boolean).at(-1)?.toLowerCase() ?? "";
  const manquants = lignes.filter((l) => statut(l).includes("manquant")).length;
  const aValider = lignes.filter((l) => statut(l).includes("à valider")).length;
  if (manquants > 0) noter("a_completer", "SOURCES.md", `${manquants} donnée(s) « manquant »`);
  if (aValider > 0) noter("a_valider", "SOURCES.md", `${aValider} donnée(s) « à valider »`);
}

/** Rapport lisible, groupé par niveau. */
export function rapportEnTexte(dossier: string, rapport: RapportPack): string {
  const titres: Record<Niveau, string> = {
    bloquant: "BLOQUANT — l'import est refusé tant que ces points restent",
    a_completer: "À COMPLÉTER — sans cela, la plateforme ne sert pas vraiment ce pays",
    a_valider: "À VALIDER — décision humaine (référent, juriste, propriétaire)",
  };
  const lignes = [`Pack ${dossier}${rapport.pays ? ` (code ${rapport.pays})` : ""}`];
  for (const niveau of ["bloquant", "a_completer", "a_valider"] as const) {
    const liste = rapport.constats.filter((c) => c.niveau === niveau);
    lignes.push("", `${titres[niveau]} : ${liste.length}`);
    for (const c of liste) lignes.push(`  - ${c.fichier} : ${c.message}`);
  }
  return lignes.join("\n");
}
