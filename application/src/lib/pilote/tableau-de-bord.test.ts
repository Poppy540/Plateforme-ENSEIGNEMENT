import { describe, expect, it } from "vitest";
import { AGENTS_FACE_AUX_ELEVES, GESTES, evaluerCloture, type FaitsCloture } from "./cloture";
import { CONDITIONS_PILOTE, evaluerConditions, type FaitsPilote } from "./conditions";
import { CRITERES, evaluerCriteres, type FaitsCriteres } from "./criteres";
import { etatDuPilote, phaseDuPilote } from "./tableau-de-bord";

const AUJOURDHUI = "2026-10-28";
const FAITS_PRETS: FaitsPilote = {
  chapitres_pilote: 3,
  chapitres_prets: 3,
  chapitres_avec_video: 0,
  familles_pilote: 1,
  familles_sans_referent: 0,
  classes: 1,
  classes_avec_enseignant: 1,
};
const variables = (ok: boolean) =>
  CONDITIONS_PILOTE.flatMap((c) => c.variables ?? []).map((point) => ({ point, ok }));
const conditionsCompletes = evaluerConditions(
  FAITS_PRETS,
  CONDITIONS_PILOTE.filter((c) => c.nature !== "automatique").map((c) => ({
    numero: c.numero,
    preuve: "Preuve fictive",
    date_preuve: "2026-10-01",
  })),
  variables(true),
);
const conditionsAuDepart = evaluerConditions({ ...FAITS_PRETS, classes: 0 }, [], variables(false));
const CALME: FaitsCriteres = {
  detresses_hors_delai: 0,
  detresses_hors_delai_max: 0,
  erreurs_contenu_anciennes: 0,
  contestations_max_question: 0,
  cout_7_jours: 0,
  agents_suspendus: [],
  acces_eleves_ouvert: true,
  suspensions_meme_cause_max: 0,
};
const SEUILS = {
  detresse_delai_heures: 2,
  detresse_delai_max_heures: 12,
  erreur_contenu_delai_jours: 7,
  contestations_max_par_question: 2,
  depassement_budget_pourcent: 50,
  budget_hebdomadaire_usd: 20,
};
const criteresCalmes = evaluerCriteres(CALME, SEUILS, []);
const FIN: FaitsCloture = {
  periode_debut: "2026-09-28",
  periode_fin: "2026-10-25",
  rapports_telecharges: 0,
  decision: null,
  decision_le: null,
  acces_eleves_ouvert: true,
  agents_suspendus: [],
};
const gestesDeFin = evaluerCloture(FIN, [], AUJOURDHUI);

describe("tableau de bord du pilote (ADR 0088)", () => {
  it("phase déduite de la période et de la clôture", () => {
    expect(phaseDuPilote(null, AUJOURDHUI, false)).toBe("preparation");
    expect(phaseDuPilote({ debut: "2026-11-03", fin: null }, AUJOURDHUI, false)).toBe(
      "preparation",
    );
    expect(phaseDuPilote({ debut: "2026-10-01", fin: null }, AUJOURDHUI, false)).toBe("en_cours");
    expect(phaseDuPilote({ debut: "2026-10-01", fin: AUJOURDHUI }, AUJOURDHUI, false)).toBe(
      "en_cours",
    );
    expect(phaseDuPilote({ debut: "2026-10-01", fin: "2026-10-27" }, AUJOURDHUI, false)).toBe(
      "termine",
    );
    expect(phaseDuPilote({ debut: "2026-10-01", fin: "2026-10-27" }, AUJOURDHUI, true)).toBe(
      "cloture",
    );
  });

  it("préparation : la première condition à remplir, puis la saisie des dates", () => {
    const depart = etatDuPilote(null, conditionsAuDepart, criteresCalmes, gestesDeFin, AUJOURDHUI);
    expect(depart.phase).toBe("preparation");
    expect(depart.action.lien).toBe("/administration/conditions#condition-1");
    expect(depart.conditions).toEqual({ remplies: 2, total: 12 });
    const pret = etatDuPilote(null, conditionsCompletes, criteresCalmes, gestesDeFin, AUJOURDHUI);
    expect(pret.action).toMatchObject({ lien: "/administration/fin-pilote" });
    const avant = etatDuPilote(
      { debut: "2026-11-03", fin: null },
      conditionsCompletes,
      criteresCalmes,
      gestesDeFin,
      AUJOURDHUI,
    );
    expect(avant.action.texte).toBe(
      "Les 12 conditions sont remplies : le pilote commence le 3 novembre 2026.",
    );
  });

  it("en cours : un critère atteint d'abord, sinon le point de la semaine", () => {
    const periode = { debut: "2026-10-01", fin: null };
    const calme = etatDuPilote(
      periode,
      conditionsCompletes,
      criteresCalmes,
      gestesDeFin,
      AUJOURDHUI,
    );
    expect(calme.action.lien).toBe("/administration/semaine");
    const alerte = etatDuPilote(
      periode,
      conditionsCompletes,
      evaluerCriteres(
        { ...CALME, detresses_hors_delai: 1, detresses_hors_delai_max: 1 },
        SEUILS,
        [],
      ),
      gestesDeFin,
      AUJOURDHUI,
    );
    expect(alerte.criteres.atteints).toBe(1);
    expect(alerte.action.lien).toBe("/administration/criteres#critere-detresse_hors_delai");
    expect(CRITERES.some((c) => alerte.action.texte.includes(c.titre))).toBe(true);
  });

  it("terminé : le premier geste à faire ; clôturé : le sort des données", () => {
    const periode = { debut: "2026-09-28", fin: "2026-10-25" };
    const termine = etatDuPilote(
      periode,
      conditionsCompletes,
      criteresCalmes,
      gestesDeFin,
      AUJOURDHUI,
    );
    expect(termine.phase).toBe("termine");
    expect(termine.action.lien).toBe("/administration/cloture#geste-questionnaires_fin");
    const complets = evaluerCloture(
      {
        ...FIN,
        rapports_telecharges: 1,
        decision: "Arrêter le pilote : fin prévue (fictif)",
        acces_eleves_ouvert: false,
        agents_suspendus: [...AGENTS_FACE_AUX_ELEVES],
      },
      GESTES.filter((g) => g.nature === "coche").map((g) => ({
        geste: g.code,
        preuve: "Preuve fictive",
        date_preuve: "2026-10-27",
      })),
      AUJOURDHUI,
    );
    const cloture = etatDuPilote(
      periode,
      conditionsCompletes,
      criteresCalmes,
      complets,
      AUJOURDHUI,
    );
    expect(cloture.phase).toBe("cloture");
    expect(cloture.action.lien).toBe("/administration/donnees");
  });
});
