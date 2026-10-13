// Lecture et contrôle d'un pack pays (referentiels/<pays>/). Aucune valeur propre à un pays ici :
// tout vient des fichiers du pack (ADR 0001).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export type Couche = "universel" | "adaptable" | "local";

export interface Pays {
  code: string;
  nom: string;
  langueEnseignement: string;
  fuseauHoraire: string;
  monnaie: string | null;
  statutPack: "en_preparation" | "pilote" | "ouvert";
  /** Âge de la majorité ; null = inconnu, tout élève est alors traité comme mineur. */
  ageMajorite: number | null;
  /** Durées de conservation en jours (cadre légal du pays) ; null = pas de purge. */
  conservation: {
    echanges_jours: number | null;
    inscription_non_confirmee_jours: number | null;
    compte_inactif_jours: number | null;
  };
}

export interface Referentiel {
  code: string;
  version: string;
  dateValidation: string | null;
  sourceOfficielle: string | null;
}

export interface Niveau {
  code: string;
  libelle: string;
  cycle: string;
  ordre: number;
  codeInterne: string;
  seriesObligatoires: boolean;
}

export interface Serie {
  code: string;
  libelle: string;
  type: string;
  codeInterne: string;
}

export interface Matiere {
  code: string;
  libelle: string;
  famille: string;
  couche: Couche;
}

export interface Unite {
  code: string;
  niveau: string;
  series: string[];
  matiere: string;
  libelleLocal: string | null;
}

export interface Chapitre {
  code: string;
  ordre: number;
  titre: string;
  sousThemes: string[];
  volumeHoraire: number | null;
  coefficient: number | null;
}

export interface PackPays {
  pays: Pays;
  referentiel: Referentiel;
  niveaux: Niveau[];
  series: Serie[];
  matieres: Matiere[];
  unites: Unite[];
  /** Chapitres par code d'unité (seulement les unités qui ont un programme). */
  programmes: Record<string, Chapitre[]>;
}

export class ErreurPack extends Error {
  readonly erreurs: string[];
  constructor(erreurs: string[]) {
    super(`Pack pays invalide :\n- ${erreurs.join("\n- ")}`);
    this.erreurs = erreurs;
  }
}

type Brut = Record<string, unknown>;

function lireYaml(chemin: string): Brut {
  const contenu: unknown = parse(readFileSync(chemin, "utf8"));
  return contenu && typeof contenu === "object" ? (contenu as Brut) : {};
}

function texte(valeur: unknown): string {
  return valeur === null || valeur === undefined ? "" : String(valeur).trim();
}

function texteOuNul(valeur: unknown): string | null {
  const t = texte(valeur);
  return t === "" ? null : t;
}

function nombreOuNul(valeur: unknown): number | null {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const n = Number(valeur);
  return Number.isFinite(n) ? n : null;
}

function liste(valeur: unknown): Brut[] {
  return Array.isArray(valeur) ? (valeur as Brut[]) : [];
}

const COUCHES: Couche[] = ["universel", "adaptable", "local"];
const STATUTS_PACK = ["en_preparation", "pilote", "ouvert"] as const;

/** Lit un pack pays et vérifie sa cohérence. Lève ErreurPack avec la liste de toutes les erreurs. */
export function lirePack(dossier: string): PackPays {
  const erreurs: string[] = [];
  const exiger = (fichier: string) => {
    const chemin = join(dossier, fichier);
    if (!existsSync(chemin)) {
      erreurs.push(`fichier manquant : ${fichier}`);
      return {};
    }
    return lireYaml(chemin);
  };

  const brutPays = exiger("pays.yaml");
  const brutStructure = exiger("structure.yaml");
  const brutMatieres = exiger("matieres.yaml");
  const brutUnites = exiger("unites.yaml");

  const brutReferentiel = (brutPays.referentiel ?? {}) as Brut;
  const statutPack = texte(brutPays.statut_pack) || "en_preparation";
  const pays: Pays = {
    code: texte(brutPays.code),
    nom: texte(brutPays.nom),
    langueEnseignement: texte(brutPays.langue_enseignement),
    fuseauHoraire: texte(brutPays.fuseau_horaire),
    monnaie: texteOuNul(brutPays.monnaie),
    statutPack: statutPack as Pays["statutPack"],
    ageMajorite: nombreOuNul(((brutPays.cadre_legal ?? {}) as Brut).age_majorite),
    conservation: (() => {
      const c = (((brutPays.cadre_legal ?? {}) as Brut).conservation ?? {}) as Brut;
      return {
        echanges_jours: nombreOuNul(c.echanges_jours),
        inscription_non_confirmee_jours: nombreOuNul(c.inscription_non_confirmee_jours),
        compte_inactif_jours: nombreOuNul(c.compte_inactif_jours),
      };
    })(),
  };
  if (!pays.code) erreurs.push("pays.yaml : code du pays manquant");
  if (!pays.nom) erreurs.push("pays.yaml : nom du pays manquant");
  if (!pays.langueEnseignement) erreurs.push("pays.yaml : langue d'enseignement manquante");
  if (!pays.fuseauHoraire) erreurs.push("pays.yaml : fuseau horaire manquant");
  if (!(STATUTS_PACK as readonly string[]).includes(statutPack)) {
    erreurs.push(`pays.yaml : statut du pack inconnu « ${statutPack} »`);
  }

  const referentiel: Referentiel = {
    code: texte(brutReferentiel.code),
    version: texte(brutReferentiel.version),
    dateValidation: texteOuNul(brutReferentiel.date_validation),
    sourceOfficielle: texteOuNul(brutReferentiel.source_officielle),
  };
  for (const [cle, valeur] of Object.entries(pays.conservation)) {
    if (valeur !== null && (!Number.isInteger(valeur) || valeur < 1)) {
      erreurs.push(`pays.yaml : durée de conservation invalide (${cle})`);
    }
  }
  if (!referentiel.code) erreurs.push("pays.yaml : code du référentiel manquant");
  if (!referentiel.version) erreurs.push("pays.yaml : version du référentiel manquante");

  const niveaux: Niveau[] = liste(brutStructure.niveaux).map((n) => ({
    code: texte(n.code),
    libelle: texte(n.libelle),
    cycle: texte(n.cycle),
    ordre: Number(n.ordre),
    codeInterne: texte(n.code_interne),
    seriesObligatoires: n.series_obligatoires === true,
  }));
  const series: Serie[] = liste(brutStructure.series).map((s) => ({
    code: texte(s.code),
    libelle: texte(s.libelle),
    type: texte(s.type),
    codeInterne: texte(s.code_interne),
  }));
  const matieres: Matiere[] = liste(brutMatieres.matieres).map((m) => ({
    code: texte(m.code),
    libelle: texte(m.libelle),
    famille: texte(m.famille),
    couche: texte(m.couche) as Couche,
  }));
  const unites: Unite[] = liste(brutUnites.unites).map((u) => ({
    code: texte(u.code),
    niveau: texte(u.niveau),
    series: Array.isArray(u.series) ? (u.series as unknown[]).map(texte) : [],
    matiere: texte(u.matiere),
    libelleLocal: texteOuNul(u.libelle_local),
  }));

  if (niveaux.length === 0) erreurs.push("structure.yaml : aucun niveau");
  verifierUnicite(
    niveaux.map((n) => n.code),
    "niveau",
    erreurs,
  );
  verifierUnicite(
    niveaux.map((n) => String(n.ordre)),
    "ordre de niveau",
    erreurs,
  );
  verifierUnicite(
    series.map((s) => s.code),
    "série",
    erreurs,
  );
  verifierUnicite(
    matieres.map((m) => m.code),
    "matière",
    erreurs,
  );
  verifierUnicite(
    unites.map((u) => u.code),
    "unité",
    erreurs,
  );

  for (const n of niveaux) {
    if (!n.code || !n.libelle || !n.cycle || !n.codeInterne || !Number.isInteger(n.ordre)) {
      erreurs.push(`structure.yaml : niveau incomplet « ${n.code || "?"} »`);
    }
  }
  for (const m of matieres) {
    if (!m.code || !m.libelle || !m.famille)
      erreurs.push(`matieres.yaml : matière incomplète « ${m.code || "?"} »`);
    if (!COUCHES.includes(m.couche))
      erreurs.push(`matieres.yaml : couche inconnue pour « ${m.code} »`);
  }

  const niveauxParCode = new Map(niveaux.map((n) => [n.code, n]));
  const codesSeries = new Set(series.map((s) => s.code));
  const codesMatieres = new Set(matieres.map((m) => m.code));
  for (const u of unites) {
    const niveau = niveauxParCode.get(u.niveau);
    if (!u.code) erreurs.push("unites.yaml : unité sans code");
    if (!niveau) erreurs.push(`unites.yaml : niveau inconnu « ${u.niveau} » pour ${u.code}`);
    if (!codesMatieres.has(u.matiere))
      erreurs.push(`unites.yaml : matière inconnue « ${u.matiere} » pour ${u.code}`);
    for (const s of u.series) {
      if (!codesSeries.has(s)) erreurs.push(`unites.yaml : série inconnue « ${s} » pour ${u.code}`);
    }
    if (niveau?.seriesObligatoires && u.series.length === 0) {
      erreurs.push(
        `unites.yaml : ${u.code} doit indiquer ses séries (classe à séries obligatoires)`,
      );
    }
    if (niveau && !niveau.seriesObligatoires && u.series.length > 0) {
      erreurs.push(`unites.yaml : ${u.code} indique des séries pour une classe sans série`);
    }
  }

  const programmes: Record<string, Chapitre[]> = {};
  const dossierProgrammes = join(dossier, "programmes");
  const codesUnites = new Set(unites.map((u) => u.code));
  if (existsSync(dossierProgrammes)) {
    for (const fichier of readdirSync(dossierProgrammes)
      .filter((f) => f.endsWith(".yaml"))
      .sort()) {
      const brut = lireYaml(join(dossierProgrammes, fichier));
      const codeUnite = texte(brut.unite);
      if (!codesUnites.has(codeUnite)) {
        erreurs.push(`programmes/${fichier} : unité inconnue « ${codeUnite} »`);
        continue;
      }
      const chapitres = liste(brut.chapitres).map((c) => ({
        code: texte(c.code),
        ordre: Number(c.ordre),
        titre: texte(c.titre),
        sousThemes: Array.isArray(c.sous_themes) ? (c.sous_themes as unknown[]).map(texte) : [],
        volumeHoraire: nombreOuNul(c.volume_horaire),
        coefficient: nombreOuNul(c.coefficient),
      }));
      for (const c of chapitres) {
        if (!c.code || !c.titre || !Number.isInteger(c.ordre)) {
          erreurs.push(`programmes/${fichier} : chapitre incomplet « ${c.code || "?"} »`);
        }
      }
      verifierUnicite(
        chapitres.map((c) => c.code),
        `chapitre de ${codeUnite}`,
        erreurs,
      );
      programmes[codeUnite] = chapitres;
    }
  }

  if (erreurs.length > 0) throw new ErreurPack(erreurs);
  return { pays, referentiel, niveaux, series, matieres, unites, programmes };
}

function verifierUnicite(codes: string[], nature: string, erreurs: string[]) {
  const vus = new Set<string>();
  for (const code of codes) {
    if (vus.has(code)) erreurs.push(`${nature} en double : « ${code} »`);
    vus.add(code);
  }
}

/** Libellés des familles de matières du pack (`familles.yaml`), par code ; vide si le fichier manque. */
export function libellesFamilles(dossier: string): Record<string, string> {
  const chemin = join(dossier, "familles.yaml");
  if (!existsSync(chemin)) return {};
  const brut = parse(readFileSync(chemin, "utf8")) as { familles?: unknown };
  return Object.fromEntries(
    liste(brut?.familles)
      .filter((f) => typeof f.code === "string" && typeof f.libelle === "string")
      .map((f) => [f.code as string, f.libelle as string]),
  );
}
