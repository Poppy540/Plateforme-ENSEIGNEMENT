// Configuration du Recruteur pour un pays (ADR 0040) : sources autorisées, canaux, délai de relance, conditions
// validées, modèles et FAQ de recrutement, lus dans le pack (recrutement.yaml). Aucune valeur de pays dans le code.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export interface ConfigurationRecrutement {
  statut: string;
  sources: { id: string; libelle: string }[];
  canaux: string[];
  delaiRelanceJours: number;
  /** null tant que le propriétaire n'a pas fixé les conditions : aucune contrepartie n'est présentée. */
  conditionsValidees: string | null;
  modeles: Record<string, string>;
  faq: { id: string; question: string; reponse: string }[];
}

const estTexte = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";

export function lireRecrutement(dossierDuPack: string): ConfigurationRecrutement | null {
  const fichier = join(dossierDuPack, "recrutement.yaml");
  if (!existsSync(fichier)) return null;
  const brut = (parse(readFileSync(fichier, "utf8")) ?? {}) as Record<string, unknown>;
  const liste = (x: unknown) =>
    (Array.isArray(x) ? x : []).filter(
      (e): e is Record<string, unknown> => !!e && typeof e === "object",
    );
  const sources = liste(brut.sources_autorisees)
    .filter((s) => estTexte(s.id) && estTexte(s.libelle))
    .map((s) => ({ id: s.id as string, libelle: s.libelle as string }));
  const faq = liste(brut.faq)
    .filter((e) => estTexte(e.id) && estTexte(e.question) && estTexte(e.reponse))
    .map((e) => ({
      id: e.id as string,
      question: e.question as string,
      reponse: e.reponse as string,
    }));
  if (new Set(sources.map((s) => s.id)).size !== sources.length)
    throw new Error("Recrutement : sources en double.");
  const delai = Number(brut.delai_relance_jours);
  const modeles = Object.fromEntries(
    Object.entries((brut.modeles_messages ?? {}) as Record<string, unknown>).filter(([, v]) =>
      estTexte(v),
    ),
  ) as Record<string, string>;
  return {
    statut: estTexte(brut.statut) ? brut.statut : "a_valider",
    sources,
    canaux: (Array.isArray(brut.canaux_approuves) ? brut.canaux_approuves : []).filter(estTexte),
    delaiRelanceJours: Number.isInteger(delai) && delai > 0 ? delai : 7,
    conditionsValidees: estTexte(brut.conditions_validees) ? brut.conditions_validees : null,
    modeles,
    faq,
  };
}

/** Valeurs du prompt calculées depuis recrutement.yaml (les autres sont dans agents/recruteur/pays.yaml). */
export function valeursRecrutement(c: ConfigurationRecrutement): Record<string, string> {
  return {
    SOURCES_AUTORISEES: c.sources.map((s) => `« ${s.id} » (${s.libelle})`).join(" ; "),
    CANAUX_APPROUVES: c.canaux.join(", ") || "aucun canal approuvé",
    MODELES_MESSAGES:
      Object.entries(c.modeles)
        .map(([nature, consigne]) => `${nature} : ${consigne}`)
        .join(" | ") || "aucun modèle",
    FAQ_RECRUTEMENT: c.faq.map((e) => `[${e.id}] ${e.question} — ${e.reponse}`).join(" | "),
    DELAIS_RELANCE: `${c.delaiRelanceJours} jours`,
    CONDITIONS_VALIDEES:
      c.conditionsValidees ??
      "AUCUNE condition validée pour l'instant (aucune mission chiffrée, aucun volume, aucune contrepartie, aucune durée) : n'en présente aucune et transmets toute question à ce sujet",
  };
}
