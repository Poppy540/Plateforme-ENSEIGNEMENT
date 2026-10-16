// Brouillon de programme au format du pack pays, produit à partir de l'extraction d'un rapport de Conformité
// (ADR 0039). Il ne modifie rien : la personne qui le télécharge le relit, le range dans le pack (dépôt git),
// puis l'import le charge « à valider » et le référent valide chaque chapitre.
import { stringify } from "yaml";
import type { RapportConformite } from "./rapport.ts";

/** Code de chapitre lisible à partir d'un titre (minuscules, sans accents, tirets). */
export function codeDeChapitre(titre: string): string {
  return (
    titre
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "chapitre"
  );
}

export function brouillonDeProgramme(
  r: RapportConformite,
  meta: {
    unite: string;
    documentTitre: string;
    empreinte: string;
    rapportVersion: number;
    date: string;
  },
): string {
  const vus = new Set<string>();
  const chapitres = r.extraction
    .slice()
    .sort((a, b) => a.ordre - b.ordre)
    .map((e, i) => {
      let code = codeDeChapitre(e.titre);
      while (vus.has(code)) code = `${code}-${i + 1}`;
      vus.add(code);
      return {
        ordre: i + 1,
        code,
        titre: e.titre,
        ...(e.sous_themes.length ? { sous_themes: e.sous_themes } : {}),
        ...(e.volume_horaire !== null ? { volume_horaire: e.volume_horaire } : {}),
        ...(e.coefficient !== null ? { coefficient: e.coefficient } : {}),
        statut: "a_valider",
      };
    });
  const sources = r.extraction
    .map(
      (e) =>
        `#   ${e.titre} : ${e.source || "sans source"} (${e.statut}, confiance ${e.confiance})${e.champs_manquants.length ? ` ; manquant : ${e.champs_manquants.join(", ")}` : ""}`,
    )
    .join("\n");
  return `# BROUILLON de programme produit par l'agent Conformité programme (rapport version ${meta.rapportVersion}, ${meta.date}).
# À RELIRE par l'enseignant-référent avant de le ranger dans le pack pays ; rien n'est validé.
# Document source : « ${meta.documentTitre} » (empreinte ${meta.empreinte.slice(0, 16)}) ; document ${r.document.officiel ? "considéré officiel" : "NON officiel ou non vérifié"}.
# Sources par chapitre :
${sources || "#   (aucune donnée extraite)"}
${stringify({ unite: meta.unite, statut: "a_valider", valide_par: null, date_validation: null, chapitres })}`;
}
