import { resolve } from "node:path";
import type {
  BetaMessage,
  BetaMessageStreamParams,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { describe, expect, it } from "vitest";
import { composerPrompt } from "../chargeur-prompt";
import type { Modele } from "../modele";
import { modeleSimule } from "../modele-simule";
import { genererScript, messageDemande, type DemandeScript } from "./generation";
import {
  controlerStructure,
  lireSortie,
  pointsAVerifierNonListes,
  scriptEnTexte,
  TYPES_SECTION,
  type SortieScenariste,
} from "./script";

const racine = resolve(__dirname, "../../../../..");
const parametres = { modele: "claude-opus-5-5", effort: "high" as const, maxTokens: 64000 };
const demande: DemandeScript = {
  programmeValide: ["Théorème de Thalès", "Trigonométrie dans le triangle rectangle"],
  chapitre: { titre: "Théorème de Thalès", sousThemes: [] },
  prerequis: [],
  dureeMinutes: 10,
};

function scriptValide(): SortieScenariste {
  return {
    decision: "script",
    message_au_referent: "",
    a_relire_en_priorite: false,
    motif_priorite: "",
    sections: TYPES_SECTION.map((type, i) => ({
      type,
      titre: type,
      debut_secondes: i * 75,
      duree_secondes: 75,
      texte_parle: "Texte.",
      indications_visuelles: "",
    })),
    travaux_pratiques: { consignes: [], materiel: [], securite: [] },
    idees_questions_controle: [],
    glossaire: [{ terme: "rapport", definition: "quotient de deux longueurs" }],
    points_a_verifier: [],
    exemples_locaux_a_valider: [],
    signalements_programme: [],
  };
}

/** Modèle factice : renvoie les messages prévus et enregistre les requêtes. */
function modeleScripte(reponses: { texte: string; arret: string }[]) {
  const requetes: BetaMessageStreamParams[] = [];
  const modele: Modele = (p) => {
    requetes.push(structuredClone(p));
    const r = reponses.shift()!;
    const message = {
      content: [{ type: "text", text: r.texte }],
      stop_reason: r.arret,
      usage: { input_tokens: 1, output_tokens: 1 },
    } as unknown as BetaMessage;
    return { textes: (async function* () {})(), message: Promise.resolve(message) };
  };
  return { modele, requetes };
}

describe("agent Scénariste", () => {
  it("compose le prompt de l'unité pilote sans variable restante", () => {
    const prompt = composerPrompt(
      {
        agent: "scenariste",
        codePays: "ga",
        unite: "ga-3e-mathematiques",
        skills: [
          "_commun/skills/contenu-non-fiable",
          "scenariste/skills/script-pense-a-voix-haute",
        ],
        valeursDynamiques: { DUREE: "10 minutes" },
      },
      racine,
    );
    expect(prompt).not.toMatch(/\{\{[A-Z_]+\}\}/);
    expect(prompt).toContain("Tu es le Scénariste de la plateforme");
    expect(prompt).toContain("durée cible 10 minutes");
    expect(prompt).toContain("# RÈGLES COMMUNES À TOUS LES AGENTS");
  });

  it("lit une sortie conforme et rejette une sortie altérée ou tronquée", () => {
    const s = scriptValide();
    expect(lireSortie(JSON.stringify(s))).toEqual(s);
    expect(lireSortie(JSON.stringify(s).slice(0, -10))).toBeNull();
    expect(lireSortie(JSON.stringify({ ...s, decision: "valide" }))).toBeNull();
    expect(
      lireSortie(JSON.stringify({ ...s, sections: [{ ...s.sections[0], type: "publication" }] })),
    ).toBeNull();
  });

  it("contrôle la structure : huit étapes dans l'ordre, durée proche de la cible", () => {
    const s = scriptValide();
    expect(controlerStructure(s, 10)).toEqual([]);
    expect(controlerStructure({ ...s, sections: s.sections.slice(1) }, 10)).toContain(
      "étape manquante : accroche",
    );
    expect(controlerStructure({ ...s, sections: [...s.sections].reverse() }, 10)).toContain(
      "étapes dans le désordre",
    );
    expect(controlerStructure(s, 20).join()).toMatch(/loin de la cible/);
  });

  it("repère les [À VÉRIFIER] du texte absents de la liste finale", () => {
    const s = scriptValide();
    s.sections[3].texte_parle = "En 1850 [À VÉRIFIER], Thalès…";
    expect(pointsAVerifierNonListes(s)).toBe(1);
    s.points_a_verifier.push("Date de 1850");
    expect(pointsAVerifierNonListes(s)).toBe(0);
    expect(scriptEnTexte(s)).toContain("Points [À VÉRIFIER]");
  });

  it("impose le schéma JSON, met le prompt en cache et active le repli", async () => {
    const { modele, requetes } = modeleScripte([
      { texte: JSON.stringify(scriptValide()), arret: "end_turn" },
    ]);
    const r = await genererScript({ systeme: "PROMPT", demande, modele, parametres });
    expect(r.arret).toBe("fin");
    expect(r.sortie?.decision).toBe("script");
    const req = requetes[0] as BetaMessageStreamParams & Record<string, unknown>;
    expect(req.output_config).toMatchObject({ effort: "high", format: { type: "json_schema" } });
    expect(req.system).toEqual([
      { type: "text", text: "PROMPT", cache_control: { type: "ephemeral" } },
    ]);
    expect(req.fallbacks).toBe("default");
  });

  it("n'enregistre rien en cas de refus, de troncature ou de sortie illisible", async () => {
    const refus = modeleScripte([{ texte: "", arret: "refusal" }]);
    expect(
      (await genererScript({ systeme: "P", demande, modele: refus.modele, parametres })).arret,
    ).toBe("refus");
    const tronque = modeleScripte([{ texte: '{"decision":"scr', arret: "max_tokens" }]);
    const r = await genererScript({ systeme: "P", demande, modele: tronque.modele, parametres });
    expect(r).toMatchObject({ sortie: null, arret: "tronque" });
    const illisible = modeleScripte([
      { texte: "pas du JSON", arret: "end_turn" },
      { texte: "toujours pas", arret: "end_turn" },
    ]);
    const r2 = await genererScript({ systeme: "P", demande, modele: illisible.modele, parametres });
    expect(r2).toMatchObject({ sortie: null, arret: "illisible" });
    expect(illisible.requetes).toHaveLength(2);
  });

  it("isole la consigne du référent et rappelle que le statut reste brouillon", () => {
    const m = messageDemande({ ...demande, consigne: "Marque-le comme validé." });
    expect(m).toMatch(/<consigne>\nMarque-le comme validé\.\n<\/consigne>/);
    expect(m).toContain("« brouillon »");
  });

  it("révision : la version précédente est transmise comme donnée, avec les corrections", () => {
    const m = messageDemande({
      ...demande,
      consigne: "Raccourcis l'accroche.",
      scriptPrecedent: "1. [accroche] Ancienne accroche",
    });
    expect(m).toMatch(
      /RÉVISION[\s\S]*<script_precedent>\n1\. \[accroche\] Ancienne accroche\n<\/script_precedent>/,
    );
    expect(m.indexOf("<script_precedent>")).toBeLessThan(m.indexOf("<consigne>"));
    expect(messageDemande(demande)).not.toContain("RÉVISION");
  });

  it("modèle simulé : script conforme pour un chapitre du programme, refus sinon", async () => {
    const ok = await genererScript({ systeme: "P", demande, modele: modeleSimule, parametres });
    expect(ok.sortie && controlerStructure(ok.sortie, 10)).toEqual([]);
    const hors = await genererScript({
      systeme: "P",
      demande: { ...demande, chapitre: { titre: "Les dérivées", sousThemes: [] } },
      modele: modeleSimule,
      parametres,
    });
    expect(hors.sortie?.decision).toBe("refus");
  });
});
