// Critères de suspension et d'arrêt du pilote (docs/pilote/criteres-arret.md ; Jalon 13, étape 1 ; ADR 0080).
// La plateforme signale, le propriétaire décide : ces fonctions ne suspendent rien. Rien ici ne nomme un pays ;
// les seuils viennent du pack pays (section « pilote » de pays.yaml) et un seuil absent rend le critère « non
// surveillé ». Fonctions pures : la page, l'exécuteur planifié et les tests s'appuient dessus.
import type { SeuilsPilote } from "@/lib/pack-pays/lecture";

/** immediat : suspension immédiate ; hebdomadaire : examen au point de la semaine ; arret : arrêt du pilote. */
export type Niveau = "immediat" | "hebdomadaire" | "arret";
export type Source = "calcule" | "declare";
export type EtatCritere = "rien_a_signaler" | "a_examiner" | "atteint" | "non_surveille";

export interface DefinitionCritere {
  code: string;
  titre: string;
  niveau: Niveau;
  source: Source;
  /** Ce qu'il faut faire si le critère est atteint (repris de criteres-arret.md). */
  action: string;
}

export interface FaitsCriteres {
  detresses_hors_delai: number | null;
  detresses_hors_delai_max: number | null;
  erreurs_contenu_anciennes: number | null;
  contestations_max_question: number;
  cout_7_jours: number;
  agents_suspendus: string[];
  acces_eleves_ouvert: boolean;
  /** Plus grand nombre de suspensions (agent ou accès des élèves) notées au journal pour un même critère. */
  suspensions_meme_cause_max: number;
}

export interface Declaration {
  critere: string;
  motif: string;
  declare_le: string;
}

export interface CritereEvalue extends DefinitionCritere {
  etat: EtatCritere;
  detail: string;
  declaration: Declaration | null;
}

export const CRITERES: readonly DefinitionCritere[] = [
  {
    code: "detresse_hors_delai",
    titre: "Détresse non prise en charge dans le délai",
    niveau: "immediat",
    source: "calcule",
    action:
      "Prendre en charge le signalement ; si l'alerte n'est pas arrivée, fermer l'accès des élèves.",
  },
  {
    code: "contenu_dangereux",
    titre:
      "Contenu dangereux, sexuel, violent ou haineux, ou agent qui se fait passer pour un humain",
    niveau: "immediat",
    source: "declare",
    action: "Suspendre l'agent ; analyse avec le référent.",
  },
  {
    code: "fuite_donnees",
    titre: "Fuite ou exposition de données",
    niveau: "immediat",
    source: "declare",
    action: "Fermer l'accès des élèves ; informer le juriste ; notifications éventuelles.",
  },
  {
    code: "contenu_non_valide_montre",
    titre: "Contenu non validé montré à un élève",
    niveau: "immediat",
    source: "declare",
    action: "Suspendre la publication ; vérifier les règles de validation.",
  },
  {
    code: "demande_etablissement",
    titre: "Demande de l'établissement ou de l'autorité académique",
    niveau: "immediat",
    source: "declare",
    action: "Suspendre et rencontrer l'établissement.",
  },
  {
    code: "erreur_contenu_non_corrigee",
    titre: "Erreur de contenu signalée et non traitée dans le délai",
    niveau: "hebdomadaire",
    source: "calcule",
    action: "Faire corriger par le référent ; sinon suspendre le contenu.",
  },
  {
    code: "contestations_repetees",
    titre: "Contestations répétées sur une même question de quiz",
    niveau: "hebdomadaire",
    source: "calcule",
    action: "Faire vérifier la question et sa correction par le référent.",
  },
  {
    code: "sortie_perimetre",
    titre: "Sortie de périmètre d'un agent (hors programme, rapport sans accord)",
    niveau: "hebdomadaire",
    source: "declare",
    action: "Examiner au point de la semaine ; suspendre l'agent si nécessaire.",
  },
  {
    code: "depassement_budget",
    titre: "Coût des agents au-delà du budget de la semaine",
    niveau: "hebdomadaire",
    source: "calcule",
    action: "Examiner les coûts par agent (Pilotage de l'exploitation).",
  },
  {
    code: "equipe_indisponible",
    titre: "Équipe de veille ou référent indisponibles plus de deux jours sans remplaçant",
    niveau: "hebdomadaire",
    source: "declare",
    action: "Trouver un remplaçant ; sinon suspendre.",
  },
  {
    code: "retrait_accord",
    titre: "Retrait de l'accord de l'établissement, ou avis défavorable du juriste",
    niveau: "arret",
    source: "declare",
    action: "Arrêter le pilote.",
  },
  {
    code: "suspensions_repetees",
    titre: "Deux suspensions immédiates pour la même cause",
    niveau: "arret",
    source: "calcule",
    action: "Arrêter le pilote.",
  },
];

const pluriel = (n: number, singulier: string, pluriel_?: string) =>
  `${n} ${n > 1 ? (pluriel_ ?? `${singulier}s`) : singulier}`;

/** Seuils de plusieurs packs (un pilote sur plusieurs pays) : le plus prudent de chaque seuil fixé. */
export function seuilsLesPlusPrudents(liste: readonly SeuilsPilote[]): SeuilsPilote {
  const min = (cle: keyof SeuilsPilote) => {
    const valeurs = liste.map((s) => s[cle]).filter((v): v is number => v !== null);
    return valeurs.length ? Math.min(...valeurs) : null;
  };
  return {
    detresse_delai_heures: min("detresse_delai_heures"),
    detresse_delai_max_heures: min("detresse_delai_max_heures"),
    erreur_contenu_delai_jours: min("erreur_contenu_delai_jours"),
    contestations_max_par_question: min("contestations_max_par_question"),
    depassement_budget_pourcent: min("depassement_budget_pourcent"),
    budget_hebdomadaire_usd: min("budget_hebdomadaire_usd"),
  };
}

function calculer(
  code: string,
  f: FaitsCriteres,
  s: SeuilsPilote,
): { etat: EtatCritere; detail: string } {
  const nonSurveille = (seuil: string) => ({
    etat: "non_surveille" as const,
    detail: `Non surveillé : ${seuil} à fixer dans le pack pays (section « pilote »).`,
  });
  if (code === "detresse_hors_delai") {
    if (f.detresses_hors_delai === null || s.detresse_delai_heures === null)
      return nonSurveille("detresse_delai_heures");
    if (f.detresses_hors_delai_max !== null && f.detresses_hors_delai_max > 0)
      return {
        etat: "atteint",
        detail: `${pluriel(f.detresses_hors_delai_max, "détresse")} sans prise en charge depuis plus de ${s.detresse_delai_max_heures} h.`,
      };
    if (f.detresses_hors_delai > 0)
      return {
        etat: "a_examiner",
        detail: `${pluriel(f.detresses_hors_delai, "détresse")} sans prise en charge depuis plus de ${s.detresse_delai_heures} h.`,
      };
    return {
      etat: "rien_a_signaler",
      detail: "Toutes les détresses sont prises en charge à temps.",
    };
  }
  if (code === "erreur_contenu_non_corrigee") {
    if (f.erreurs_contenu_anciennes === null || s.erreur_contenu_delai_jours === null)
      return nonSurveille("erreur_contenu_delai_jours");
    return f.erreurs_contenu_anciennes > 0
      ? {
          etat: "a_examiner",
          detail: `${pluriel(f.erreurs_contenu_anciennes, "erreur")} de contenu non traitée(s) depuis plus de ${s.erreur_contenu_delai_jours} jours.`,
        }
      : {
          etat: "rien_a_signaler",
          detail: "Aucune erreur de contenu en attente au-delà du délai.",
        };
  }
  if (code === "contestations_repetees") {
    if (s.contestations_max_par_question === null)
      return nonSurveille("contestations_max_par_question");
    return f.contestations_max_question > s.contestations_max_par_question
      ? {
          etat: "a_examiner",
          detail: `Une question a reçu ${f.contestations_max_question} contestations en 7 jours (seuil : ${s.contestations_max_par_question}). Justifiées ou non : à voir avec le référent.`,
        }
      : {
          etat: "rien_a_signaler",
          detail: `Au plus ${f.contestations_max_question} contestation(s) sur une même question en 7 jours.`,
        };
  }
  if (code === "suspensions_repetees")
    return f.suspensions_meme_cause_max >= 2
      ? {
          etat: "atteint",
          detail: `${f.suspensions_meme_cause_max} suspensions notées au journal du pilote pour une même cause.`,
        }
      : {
          etat: "rien_a_signaler",
          detail: "Pas deux suspensions pour une même cause au journal du pilote.",
        };
  // depassement_budget
  if (s.budget_hebdomadaire_usd === null || s.depassement_budget_pourcent === null)
    return nonSurveille(
      s.budget_hebdomadaire_usd === null
        ? "budget_hebdomadaire_usd"
        : "depassement_budget_pourcent",
    );
  const plafond = s.budget_hebdomadaire_usd * (1 + s.depassement_budget_pourcent / 100);
  const cout = `${f.cout_7_jours.toFixed(2)} USD sur 7 jours, budget ${s.budget_hebdomadaire_usd.toFixed(2)} USD`;
  return f.cout_7_jours > plafond
    ? {
        etat: "a_examiner",
        detail: `${cout} : plus de ${s.depassement_budget_pourcent} % au-delà.`,
      }
    : { etat: "rien_a_signaler", detail: `${cout}.` };
}

export function evaluerCriteres(
  faits: FaitsCriteres,
  seuils: SeuilsPilote,
  declarations: readonly Declaration[],
): CritereEvalue[] {
  return CRITERES.map((d) => {
    if (d.source === "calcule")
      return { ...d, ...calculer(d.code, faits, seuils), declaration: null };
    const declaration = declarations.find((x) => x.critere === d.code) ?? null;
    return {
      ...d,
      etat: declaration
        ? d.niveau === "hebdomadaire"
          ? "a_examiner"
          : "atteint"
        : "rien_a_signaler",
      detail: declaration ? "Déclaré par l'administration." : "Rien de déclaré.",
      declaration,
    };
  });
}

/** Synthèse pour l'en-tête de la page et pour le rapport de la semaine. */
export function synthese(criteres: readonly CritereEvalue[]) {
  const compter = (e: EtatCritere) => criteres.filter((c) => c.etat === e).length;
  return {
    atteints: compter("atteint"),
    aExaminer: compter("a_examiner"),
    nonSurveilles: compter("non_surveille"),
    arret: criteres.some((c) => c.niveau === "arret" && c.etat === "atteint"),
  };
}

/**
 * Critères calculés à signaler dans la file humaine (une alerte par épisode ; jamais de donnée d'élève). L'épisode
 * porte aussi l'état : un critère « à examiner » qui devient « atteint » est signalé de nouveau, en priorité 1.
 */
export function alertesASignaler(criteres: readonly CritereEvalue[]) {
  return criteres
    .filter((c) => c.source === "calcule" && (c.etat === "atteint" || c.etat === "a_examiner"))
    .map((c) => ({
      critere: `${c.code}_${c.etat}`,
      priorite: c.etat === "atteint" ? 1 : 2,
      resume: `${c.titre}. ${c.detail}`.slice(0, 300),
    }));
}
