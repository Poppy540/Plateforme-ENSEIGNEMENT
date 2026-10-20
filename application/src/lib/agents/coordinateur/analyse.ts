// Analyse déterministe d'une famille de matières pour le Coordinateur (ADR 0038) : données lues par le serveur,
// constats automatiques (chapitres isolés, liens vers des chapitres non validés) et un ordre compatible avec les
// prérequis. Le Coordinateur (modèle) travaille sur ces données ; le serveur contrôle ensuite sa sortie.

export interface ChapitreFamille {
  /** Référence « <unité>/<code> ». */
  ref: string;
  titre: string;
  statut: "a_valider" | "valide" | "rejete";
  sousThemes: string[];
}

export interface UniteFamille {
  code: string;
  niveau: string;
  ordreNiveau: number;
  series: string[];
  chapitres: ChapitreFamille[];
}

export interface LienFamille {
  chapitre: string;
  prerequis: string;
  nature: "strict" | "souple";
  statut: "a_valider" | "valide" | "rejete";
}

export interface DonneesFamille {
  famille: string;
  libelleFamille: string;
  unites: UniteFamille[];
  liens: LienFamille[];
  /** Extraits de contenus VALIDÉS (scripts, quiz) : données non fiables. */
  contenus: { chapitre: string; type: "script" | "quiz"; version: number; extrait: string }[];
  /** Statistiques agrégées (quiz d'au moins 5 tentatives). */
  statistiques: { chapitre: string; question: number; tentatives: number; tauxReussite: number }[];
  /** Quiz écartés des statistiques : moins de 5 tentatives (groupe trop petit pour rester anonyme). */
  quizTropPetits: number;
  /** Charte adoptée (glossaire), s'il y en a une. */
  charte: { terme: string; definition: string; niveaux: string[]; notation: string }[];
}

export const tousLesChapitres = (d: DonneesFamille) => d.unites.flatMap((u) => u.chapitres);

/** Niveau (ordre) de chaque chapitre, par référence. */
export function ordreDesNiveaux(d: DonneesFamille): Map<string, number> {
  return new Map(d.unites.flatMap((u) => u.chapitres.map((c) => [c.ref, u.ordreNiveau] as const)));
}

/** Séries de l'unité de chaque chapitre (référence « <unité>/<code> » ; vide : pas de série). */
export function seriesDesChapitres(d: DonneesFamille): Map<string, string[]> {
  return new Map(d.unites.flatMap((u) => u.chapitres.map((c) => [c.ref, u.series] as const)));
}

/** Un prérequis propre à des séries ne vaut que pour un chapitre de ces mêmes séries (ADR 0047). */
export function seriesCompatibles(chapitre: string[], prerequis: string[]): boolean {
  return (
    prerequis.length === 0 || (chapitre.length > 0 && chapitre.every((s) => prerequis.includes(s)))
  );
}

/** Vrai si ajouter « chapitre ← prérequis » crée un cycle avec les liens donnés (rejetés exclus). */
export function creeUnCycle(
  liens: { chapitre: string; prerequis: string; statut?: string }[],
  chapitre: string,
  prerequis: string,
): boolean {
  if (chapitre === prerequis) return true;
  const amont = new Map<string, string[]>();
  for (const l of liens.filter((l) => l.statut !== "rejete"))
    amont.set(l.chapitre, [...(amont.get(l.chapitre) ?? []), l.prerequis]);
  const vus = new Set<string>();
  const pile = [prerequis];
  while (pile.length > 0) {
    const n = pile.pop()!;
    if (n === chapitre) return true;
    if (vus.has(n)) continue;
    vus.add(n);
    pile.push(...(amont.get(n) ?? []));
  }
  return false;
}

/** Ordre de tous les chapitres compatible avec les prérequis (non rejetés) : niveau, puis ordre du programme. */
export function ordreCompatible(d: DonneesFamille): string[] {
  const ordre = new Map(
    d.unites
      .slice()
      .sort((a, b) => a.ordreNiveau - b.ordreNiveau || a.code.localeCompare(b.code))
      .flatMap((u) => u.chapitres.map((c) => c.ref))
      .map((ref, i) => [ref, i] as const),
  );
  const avant = new Map<string, string[]>();
  for (const l of d.liens.filter((l) => l.statut !== "rejete"))
    avant.set(l.chapitre, [...(avant.get(l.chapitre) ?? []), l.prerequis]);
  const resultat: string[] = [];
  const places = new Set<string>();
  const placer = (ref: string, chemin = new Set<string>()) => {
    if (places.has(ref) || chemin.has(ref) || !ordre.has(ref)) return;
    chemin.add(ref);
    for (const p of (avant.get(ref) ?? []).sort((a, b) => ordre.get(a)! - ordre.get(b)!))
      placer(p, chemin);
    places.add(ref);
    resultat.push(ref);
  };
  for (const ref of [...ordre.keys()]) placer(ref);
  return resultat;
}

/** Constats calculés sans modèle, donnés au Coordinateur comme points de départ. */
export function constatsAutomatiques(d: DonneesFamille): string[] {
  const constats: string[] = [];
  const titres = new Map(tousLesChapitres(d).map((c) => [c.ref, c.titre]));
  const statut = new Map(tousLesChapitres(d).map((c) => [c.ref, c.statut]));
  const niveauMin = Math.min(...d.unites.map((u) => u.ordreNiveau));
  const ordre = ordreDesNiveaux(d);
  const relies = new Set(
    d.liens.filter((l) => l.statut !== "rejete").flatMap((l) => [l.chapitre, l.prerequis]),
  );
  for (const c of tousLesChapitres(d))
    if (!relies.has(c.ref) && (ordre.get(c.ref) ?? niveauMin) > niveauMin)
      constats.push(`Chapitre isolé (aucun prérequis ni suite) : ${c.ref} « ${c.titre} ».`);
  for (const l of d.liens.filter((l) => l.statut === "valide"))
    if (statut.get(l.prerequis) !== "valide")
      constats.push(
        `Lien validé vers un chapitre non validé : ${l.chapitre} ← ${l.prerequis} « ${titres.get(l.prerequis) ?? "?"} ».`,
      );
  const enAttente = d.liens.filter((l) => l.statut === "a_valider").length;
  if (enAttente > 0)
    constats.push(`${enAttente} lien(s) de prérequis encore à valider par le référent.`);
  if (d.quizTropPetits > 0)
    constats.push(
      `${d.quizTropPetits} quiz écarté(s) des statistiques : moins de 5 tentatives (groupe trop petit pour rester anonyme).`,
    );
  return constats;
}
