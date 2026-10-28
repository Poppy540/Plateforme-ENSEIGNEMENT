// Sort des données en fin de pilote (Jalon 14, étape 3 ; ADR 0086). SIMULATION : ce que la purge planifiée
// effacerait aujourd'hui selon les durées du pack, et à quelle date toutes les données du pilote d'une catégorie
// auraient dépassé leur durée (dernier jour du pilote + durée). Rien n'est effacé. Fonctions pures.
import { effectif } from "@/lib/exploitation/indicateurs";

export interface LigneSimulation {
  categorie: string;
  duree_jours: number | null;
  total: number;
  a_effacer: number;
}

export interface CategorieSimulee {
  categorie: string;
  libelle: string;
  regle: string;
  duree: string;
  total: string;
  aEffacer: string;
  datePrevue: string;
}

const CATEGORIES: Record<string, { libelle: string; regle: string; personnes: boolean }> = {
  echanges: {
    libelle: "Échanges avec le professeur IA",
    regle: "effacés après la durée, compte gardé",
    personnes: false,
  },
  inscriptions_non_confirmees: {
    libelle: "Inscriptions jamais acceptées par un parent",
    regle: "compte effacé après la durée",
    personnes: true,
  },
  comptes_inactifs: {
    libelle: "Comptes d'élèves sans activité",
    regle: "compte et toutes ses données effacés après la durée sans activité",
    personnes: true,
  },
  signalements_traites: {
    libelle: "Signalements traités",
    regle: "effacés après la durée (jamais un signalement ouvert)",
    personnes: false,
  },
  tickets_resolus: {
    libelle: "Tickets du Support résolus",
    regle: "effacés après la durée (jamais un ticket ouvert)",
    personnes: false,
  },
  rapports_parents: {
    libelle: "Rapports hebdomadaires aux parents",
    regle: "effacés après la durée",
    personnes: false,
  },
  candidats_clos: {
    libelle: "Candidats au recrutement refusés ou supprimés",
    regle: "fiche effacée après la durée (la liste d'opposition reste)",
    personnes: true,
  },
};

const JOUR_MS = 86_400_000;
const formatJour = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

/** Date à laquelle toutes les données de la catégorie liées au pilote auront dépassé leur durée. */
export function datePrevue(finPilote: string | null, duree: number | null): string {
  if (duree === null) return "Durée non fixée : rien n'est effacé";
  if (!finPilote) return "Dernier jour du pilote non saisi";
  return formatJour.format(
    new Date(new Date(`${finPilote}T00:00:00Z`).getTime() + duree * JOUR_MS),
  );
}

export function simulerSortDesDonnees(
  lignes: readonly LigneSimulation[],
  finPilote: string | null,
): CategorieSimulee[] {
  return lignes.map((l) => {
    const c = CATEGORIES[l.categorie] ?? { libelle: l.categorie, regle: "", personnes: false };
    const nombre = (n: number) => (c.personnes ? effectif(n) : String(n));
    return {
      categorie: l.categorie,
      libelle: c.libelle,
      regle: c.regle,
      duree: l.duree_jours === null ? "non fixée" : `${l.duree_jours} jours`,
      total: nombre(l.total),
      aEffacer: l.duree_jours === null ? "—" : nombre(l.a_effacer),
      datePrevue: datePrevue(finPilote, l.duree_jours),
    };
  });
}
