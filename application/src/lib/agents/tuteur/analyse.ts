// Analyse déterministe du parcours de l'élève pour le Tuteur (prompt du Tuteur, méthode 1 ; ADR 0030) :
// repérer les chapitres en difficulté, remonter le graphe de prérequis validé jusqu'à la notion de base
// manquante (même d'une classe inférieure), et proposer une courte liste de chapitres candidats. Le Tuteur
// (modèle) ne choisit ensuite que parmi ces candidats : il n'invente aucun chapitre.

export const SEUIL_DIFFICULTE = 50;
export const CANDIDATS_MAX = 8;

export interface ChapitreParcours {
  id: string;
  titre: string;
  unite: string;
  ordre: number;
  /** Chapitre d'une unité de la classe de l'élève (sinon : prérequis d'une classe inférieure). */
  deSaClasse: boolean;
  statut: "a_voir" | "en_cours" | "termine" | null;
  /** Meilleure information disponible : dernier score de quiz, sinon score de progression. */
  score: number | null;
}

export interface Candidat {
  chapitreId: string;
  titre: string;
  unite: string;
  raison: "notion_de_base" | "difficulte" | "en_cours" | "suite";
  /** Pour une notion de base : le chapitre en difficulté qui y a mené. */
  pourChapitre: string | null;
  score: number | null;
}

const enDifficulte = (c: ChapitreParcours) => c.score !== null && c.score < SEUIL_DIFFICULTE;

/**
 * @param prerequis liens validés chapitre → prérequis (identifiants)
 */
export function candidatsDeRevision(
  chapitres: ChapitreParcours[],
  prerequis: { chapitreId: string; prerequisId: string }[],
): Candidat[] {
  const parId = new Map(chapitres.map((c) => [c.id, c]));
  const prerequisDe = (id: string) =>
    prerequis
      .filter((p) => p.chapitreId === id)
      .map((p) => parId.get(p.prerequisId))
      .filter(Boolean) as ChapitreParcours[];

  // Notion de base : le prérequis fragile le plus profond (en difficulté, sinon jamais travaillé).
  function notionDeBase(
    depart: ChapitreParcours,
    vus = new Set<string>(),
  ): ChapitreParcours | null {
    vus.add(depart.id);
    let meilleure: { c: ChapitreParcours; profondeur: number; difficulte: boolean } | null = null;
    const explorer = (c: ChapitreParcours, profondeur: number) => {
      for (const p of prerequisDe(c.id)) {
        if (vus.has(p.id)) continue;
        vus.add(p.id);
        const fragile = enDifficulte(p) || p.statut === null || p.statut === "a_voir";
        if (fragile) {
          const candidat = { c: p, profondeur, difficulte: enDifficulte(p) };
          if (
            !meilleure ||
            (candidat.difficulte && !meilleure.difficulte) ||
            (candidat.difficulte === meilleure.difficulte &&
              candidat.profondeur > meilleure.profondeur)
          )
            meilleure = candidat;
        }
        // On remonte tout le graphe : une notion maîtrisée peut cacher une notion de base fragile plus loin.
        explorer(p, profondeur + 1);
      }
    };
    explorer(depart, 1);
    return (meilleure as { c: ChapitreParcours } | null)?.c ?? null;
  }

  const resultat: Candidat[] = [];
  const ajouter = (c: ChapitreParcours, raison: Candidat["raison"], pour: string | null = null) => {
    if (resultat.some((r) => r.chapitreId === c.id)) return;
    resultat.push({
      chapitreId: c.id,
      titre: c.titre,
      unite: c.unite,
      raison,
      pourChapitre: pour,
      score: c.score,
    });
  };

  const difficiles = chapitres
    .filter((c) => c.deSaClasse && enDifficulte(c))
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  for (const d of difficiles) {
    const base = notionDeBase(d);
    if (base) ajouter(base, "notion_de_base", d.titre);
  }
  for (const d of difficiles) ajouter(d, "difficulte");
  const deSaClasse = chapitres
    .filter((c) => c.deSaClasse)
    .sort((a, b) => a.unite.localeCompare(b.unite) || a.ordre - b.ordre);
  for (const c of deSaClasse.filter((c) => c.statut === "en_cours")) ajouter(c, "en_cours");
  for (const c of deSaClasse.filter((c) => c.statut === null || c.statut === "a_voir"))
    ajouter(c, "suite");
  return resultat.slice(0, CANDIDATS_MAX);
}
