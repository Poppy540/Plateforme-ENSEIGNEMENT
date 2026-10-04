import type {
  BetaMessage,
  BetaMessageStreamParams,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { describe, expect, it, vi } from "vitest";
import type { Modele } from "../modele";
import { repondre, type EntreeBoucle } from "./boucle";

type Bloc = Record<string, unknown>;

/** Modèle factice : renvoie la suite de messages prévue et enregistre les requêtes reçues. */
function modeleScripte(reponses: { contenu: Bloc[]; arret: string }[]) {
  const requetes: BetaMessageStreamParams[] = [];
  const modele: Modele = (parametres) => {
    requetes.push(structuredClone(parametres));
    const r = reponses.shift() ?? { contenu: [{ type: "text", text: "fin" }], arret: "end_turn" };
    const message = { content: r.contenu, stop_reason: r.arret } as unknown as BetaMessage;
    async function* textes() {
      for (const b of r.contenu) if (b.type === "text") yield b.text as string;
    }
    return { textes: textes(), message: Promise.resolve(message) };
  };
  return { modele, requetes };
}

function entree(modele: Modele, executerOutil = vi.fn(async () => "ok")): EntreeBoucle {
  return {
    systeme: "PROMPT",
    contexteSession: "Chapitre en cours : « Thalès ».",
    historique: [],
    question: "Bonjour",
    modele,
    parametres: { modele: "claude-opus-5-5", effort: "medium", maxTokens: 16000 },
    executerOutil,
    emettre: () => undefined,
  };
}

describe("boucle de l'agent Professeur", () => {
  it("répond en texte et met en cache le prompt système (le contexte de session vient après)", async () => {
    const { modele, requetes } = modeleScripte([
      { contenu: [{ type: "text", text: "Salut" }], arret: "end_turn" },
    ]);
    const sortie = await repondre(entree(modele));
    expect(sortie).toEqual({ texte: "Salut", arret: "fin", appels: [] });
    const systeme = requetes[0].system as { text: string; cache_control?: unknown }[];
    expect(systeme[0]).toMatchObject({ text: "PROMPT", cache_control: { type: "ephemeral" } });
    expect(systeme[1].cache_control).toBeUndefined();
    expect(requetes[0].model).toBe("claude-opus-5-5");
    expect(requetes[0].fallbacks).toBe("default");
  });

  it("exécute un outil validé puis renvoie son résultat au modèle", async () => {
    const executer = vi.fn(async () => "Signalement transmis à un humain.");
    const { modele, requetes } = modeleScripte([
      {
        contenu: [
          { type: "text", text: "Je préviens quelqu'un." },
          {
            type: "tool_use",
            id: "t1",
            name: "signaler",
            input: { motif: "detresse", resume: "Élève triste." },
          },
        ],
        arret: "tool_use",
      },
      { contenu: [{ type: "text", text: "Parle à un adulte de confiance." }], arret: "end_turn" },
    ]);
    const sortie = await repondre(entree(modele, executer));
    expect(executer).toHaveBeenCalledWith({
      nom: "signaler",
      motif: "detresse",
      resume: "Élève triste.",
    });
    expect(sortie.arret).toBe("fin");
    expect(sortie.texte).toContain("Parle à un adulte");
    const dernier = requetes[1].messages.at(-1)!;
    expect(dernier.content).toEqual([
      { type: "tool_result", tool_use_id: "t1", content: "Signalement transmis à un humain." },
    ]);
  });

  it("n'exécute pas un outil dont l'entrée ne respecte pas le schéma", async () => {
    const executer = vi.fn(async () => "ok");
    const { modele, requetes } = modeleScripte([
      {
        contenu: [
          {
            type: "tool_use",
            id: "t1",
            name: "enregistrer_progression",
            input: { statut: "valide", note: 20 },
          },
        ],
        arret: "tool_use",
      },
    ]);
    await repondre(entree(modele, executer));
    expect(executer).not.toHaveBeenCalled();
    expect(requetes[1].messages.at(-1)!.content).toEqual([
      expect.objectContaining({ is_error: true, tool_use_id: "t1" }),
    ]);
  });

  it("n'exécute pas un outil inconnu", async () => {
    const executer = vi.fn(async () => "ok");
    const { modele } = modeleScripte([
      {
        contenu: [{ type: "tool_use", id: "t1", name: "publier_chapitre", input: {} }],
        arret: "tool_use",
      },
    ]);
    await repondre(entree(modele, executer));
    expect(executer).not.toHaveBeenCalled();
  });

  it("s'arrête sur un refus sans exécuter d'outil", async () => {
    const executer = vi.fn(async () => "ok");
    const { modele } = modeleScripte([
      {
        contenu: [
          { type: "tool_use", id: "t1", name: "signaler", input: { motif: "autre", resume: "x" } },
        ],
        arret: "refusal",
      },
    ]);
    const sortie = await repondre(entree(modele, executer));
    expect(sortie.arret).toBe("refus");
    expect(executer).not.toHaveBeenCalled();
  });

  it("n'exécute pas une entrée d'outil coupée par la limite de jetons", async () => {
    const executer = vi.fn(async () => "ok");
    const { modele } = modeleScripte([
      {
        contenu: [
          {
            type: "tool_use",
            id: "t1",
            name: "enregistrer_progression",
            input: { statut: "termine" },
          },
        ],
        arret: "max_tokens",
      },
    ]);
    expect((await repondre(entree(modele, executer))).arret).toBe("tronque");
    expect(executer).not.toHaveBeenCalled();
  });

  it("limite le nombre de tours d'outils", async () => {
    const boucleInfinie = Array.from({ length: 10 }, (_, i) => ({
      contenu: [
        {
          type: "tool_use",
          id: `t${i}`,
          name: "enregistrer_progression",
          input: { statut: "en_cours" },
        },
      ],
      arret: "tool_use",
    }));
    const { modele, requetes } = modeleScripte(boucleInfinie);
    expect((await repondre({ ...entree(modele), maxIterations: 3 })).arret).toBe("limite");
    expect(requetes).toHaveLength(3);
  });
});
