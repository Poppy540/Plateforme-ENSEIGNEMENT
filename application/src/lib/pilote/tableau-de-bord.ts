// Tableau de bord du pilote (Jalon 15, étape 1 ; ADR 0088) : phase du pilote déduite des données (période,
// clôture), décomptes de chaque phase et prochaine action, avec le lien vers la bonne page. Ne fait que lire
// l'existant : conditions (ADR 0078), critères (ADR 0080), période (ADR 0084), clôture (ADR 0085). Fonctions pures.
import { decompteCloture, type GesteEvalue } from "./cloture";
import { decompte, type ConditionEvaluee } from "./conditions";
import { synthese, type CritereEvalue } from "./criteres";

export type Phase = "preparation" | "en_cours" | "termine" | "cloture";

export const LIBELLES_PHASE: Record<Phase, string> = {
  preparation: "Préparation",
  en_cours: "Pilote en cours",
  termine: "Pilote terminé, clôture en cours",
  cloture: "Pilote clôturé",
};

const formatJour = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
/** Date lisible (« 3 novembre 2026 ») à partir de AAAA-MM-JJ. */
export const jour = (iso: string) => formatJour.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

export interface Periode {
  debut: string;
  fin: string | null;
}

export interface Action {
  texte: string;
  lien: string;
  libelleLien: string;
}

export interface EtatDuPilote {
  phase: Phase;
  periode: Periode | null;
  conditions: { remplies: number; total: number };
  criteres: { atteints: number; aExaminer: number; arret: boolean };
  cloture: { faits: number; total: number; complete: boolean };
  action: Action;
}

/** Phase : avant le premier jour (ou sans période), pendant, après la fin, puis clôturé (8 / 8). */
export function phaseDuPilote(
  periode: Periode | null,
  aujourdhui: string,
  clotureComplete: boolean,
): Phase {
  if (!periode || periode.debut > aujourdhui) return "preparation";
  if (periode.fin === null || periode.fin >= aujourdhui) return "en_cours";
  return clotureComplete ? "cloture" : "termine";
}

function prochaineAction(
  phase: Phase,
  periode: Periode | null,
  conditions: readonly ConditionEvaluee[],
  criteres: readonly CritereEvalue[],
  gestes: readonly GesteEvalue[],
): Action {
  if (phase === "preparation") {
    const condition = conditions.find((c) => c.etat !== "remplie");
    if (condition)
      return {
        texte: `Remplir la condition ${condition.numero} : ${condition.titre}.`,
        lien: `/administration/conditions#condition-${condition.numero}`,
        libelleLien: "Conditions du pilote",
      };
    if (!periode)
      return {
        texte: "Les 12 conditions sont remplies : saisir les dates du pilote.",
        lien: "/administration/fin-pilote",
        libelleLien: "Période du pilote",
      };
    return {
      texte: `Les 12 conditions sont remplies : le pilote commence le ${jour(periode.debut)}.`,
      lien: "/administration/conditions",
      libelleLien: "Conditions du pilote",
    };
  }
  if (phase === "en_cours") {
    const atteint = criteres.find((c) => c.etat === "atteint");
    if (atteint)
      return {
        texte: `Critère atteint : ${atteint.titre}. ${atteint.action}`,
        lien: `/administration/criteres#critere-${atteint.code}`,
        libelleLien: "Critères de suspension",
      };
    if (criteres.some((c) => c.etat === "a_examiner"))
      return {
        texte:
          "Des critères sont à examiner : les voir au point de la semaine, puis noter le point au journal.",
        lien: "/administration/criteres",
        libelleLien: "Critères de suspension",
      };
    return {
      texte: "Rien à signaler : tenir le point de la semaine et le noter au journal.",
      lien: "/administration/semaine",
      libelleLien: "Semaine du pilote",
    };
  }
  if (phase === "termine") {
    const geste = gestes.find((g) => g.etat === "a_faire");
    return {
      texte: geste ? `Clôture : ${geste.titre}.` : "Clôture : vérifier les gestes.",
      lien:
        geste?.code === "rapport_fin"
          ? "/administration/fin-pilote"
          : `/administration/cloture#geste-${geste?.code ?? ""}`,
      libelleLien: geste?.code === "rapport_fin" ? "Rapport de fin de pilote" : "Clôture du pilote",
    };
  }
  return {
    texte:
      "Pilote clôturé : consulter le sort des données avec le juriste, puis décider de la suite.",
    lien: "/administration/donnees",
    libelleLien: "Sort des données",
  };
}

export function etatDuPilote(
  periode: Periode | null,
  conditions: readonly ConditionEvaluee[],
  criteres: readonly CritereEvalue[],
  gestes: readonly GesteEvalue[],
  aujourdhui: string,
): EtatDuPilote {
  const cloture = decompteCloture(gestes);
  const { remplies, total } = decompte(conditions);
  const { atteints, aExaminer, arret } = synthese(criteres);
  const phase = phaseDuPilote(periode, aujourdhui, cloture.complete);
  return {
    phase,
    periode,
    conditions: { remplies, total },
    criteres: { atteints, aExaminer, arret },
    cloture,
    action: prochaineAction(phase, periode, conditions, criteres, gestes),
  };
}
