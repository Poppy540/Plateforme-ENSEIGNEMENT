// Leçon écrite d'un chapitre (Jalon 6, étape 4 ; ADR 0051) : texte du script validé, servi par la base
// (`lecon_du_chapitre`) puis vérifié ici avant l'affichage. Rien d'autre que le texte destiné aux élèves.

export interface LeconEcrite {
  version: number;
  sections: { type: string; titre: string; texte: string }[];
  glossaire: { terme: string; definition: string }[];
  consignes: string[];
  securite: string[];
}

const chaine = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v.slice(0, 50) : []);

/** Leçon lisible, ou null si la donnée est absente ou ne contient aucun texte. */
export function lireLecon(brut: unknown): LeconEcrite | null {
  if (!brut || typeof brut !== "object") return null;
  const b = brut as Record<string, unknown>;
  const sections = liste(b.sections)
    .map((s) => {
      const x = (s ?? {}) as Record<string, unknown>;
      return {
        type: chaine(x.type, 40),
        titre: chaine(x.titre, 200),
        texte: chaine(x.texte, 8000),
      };
    })
    .filter((s) => s.texte !== "");
  if (sections.length === 0) return null;
  return {
    version: Number.isInteger(b.version) ? (b.version as number) : 0,
    sections,
    glossaire: liste(b.glossaire)
      .map((g) => {
        const x = (g ?? {}) as Record<string, unknown>;
        return { terme: chaine(x.terme, 100), definition: chaine(x.definition, 1000) };
      })
      .filter((g) => g.terme && g.definition),
    consignes: liste(b.consignes)
      .map((c) => chaine(c, 1000))
      .filter(Boolean),
    securite: liste(b.securite)
      .map((c) => chaine(c, 1000))
      .filter(Boolean),
  };
}
