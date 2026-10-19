// Essai de portabilité (Jalon 4, étape 5 ; ADR 0041) : le pack FICTIF « zz » se charge et configure chaque agent
// sans modifier le code, et aucune valeur d'un pays n'apparaît dans les prompts de l'autre.
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { composerPrompt, dossierPack } from "../agents/chargeur-prompt";
import { skillsCoordinateur } from "../agents/coordinateur/configuration";
import { lireRecrutement, valeursRecrutement } from "../agents/recruteur/configuration";
import { lireFaq } from "../agents/support/faq";
import { libellesFamilles, lirePack } from "./lecture";

const racine = resolve(__dirname, "../../../..");
const PAYS = {
  ga: { unite: "ga-3e-mathematiques", referentiel: "ga-general" },
  zz: { unite: "zz-an3-mathematiques", referentiel: "zz-general" },
} as const;
// Repères propres à chaque pack (dans les fichiers du pack, jamais dans le code testé).
const MARQUEURS = {
  ga: /Gabon|gabonais|BEPC|IPN|Libreville|Ogooué|CFA|XAF|CEMAC/,
  zz: /pays Z|Pays fictif Z|Zédie|Certificat fictif/,
};
// Phrase du prompt de la Conformité (recopié du cadrage, jamais réécrit) : elle cite un autre pays en exemple.
const EXEMPLE_DU_PROMPT_CONFORMITE = /les séries gabonaises ailleurs/;

/** Toutes les skills d'un agent (plus la skill commune), pour que rien n'échappe au contrôle. */
function skills(agent: string): string[] {
  const dossier = join(racine, "agents", agent, "skills");
  const propres = existsSync(dossier)
    ? readdirSync(dossier, { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(join(dossier, d.name, "SKILL.md")))
        .map((d) => `${agent}/skills/${d.name}`)
    : [];
  return ["_commun/skills/contenu-non-fiable", ...propres];
}

function prompts(code: keyof typeof PAYS): Record<string, string> {
  const p = PAYS[code];
  const pack = dossierPack(racine, code);
  const dynamiques = {
    LISTE_CHAPITRES: "chapitres",
    CHAPITRE_EN_COURS: "chapitre",
    DUREE: "10",
    REFERENTIEL: p.referentiel,
    VERSION_REFERENTIEL: "0.1",
  };
  const composer = (agent: string, unite: string, liste = skills(agent), autres = {}) =>
    composerPrompt(
      {
        agent,
        codePays: code,
        unite,
        skills: liste,
        valeursDynamiques: { ...dynamiques, ...autres },
      },
      racine,
    );
  return {
    professeur: composer("professeur", p.unite),
    scenariste: composer("scenariste", p.unite),
    evaluateur: composer("evaluateur", p.unite),
    tuteur: composer("tuteur", "pays"),
    support: composer("support", "pays"),
    conformite: composer("conformite", "pays"),
    coordinateur: composer(
      "coordinateur",
      "mathematiques",
      skillsCoordinateur(pack, "mathematiques"),
    ),
    recruteur: composer(
      "recruteur",
      "pays",
      skills("recruteur"),
      valeursRecrutement(lireRecrutement(pack)!),
    ),
  };
}

describe("pack fictif zz à côté du pilote", () => {
  it("se lit sans erreur, avec sa propre structure et le statut « test »", () => {
    const pack = lirePack(dossierPack(racine, "zz"));
    expect(pack.pays.statutPack).toBe("test");
    expect(pack.niveaux.map((n) => n.code)).toEqual(["an1", "an2", "an3", "an4"]);
    expect(pack.unites).toHaveLength(6);
    expect(pack.programmes["zz-an3-mathematiques"][0]).toMatchObject({
      volumeHoraire: 10,
      coefficient: 4,
    });
    expect(lirePack(dossierPack(racine, "ga")).pays.statutPack).not.toBe("test");
  });

  it("garde sa FAQ, ses familles et son recrutement", () => {
    const faqZ = lireFaq(dossierPack(racine, "zz"));
    const faqG = lireFaq(dossierPack(racine, "ga"));
    expect(faqZ.entrees.map((e) => e.id)).toContain("option-zz");
    expect(faqG.entrees.map((e) => e.id)).not.toContain("option-zz");
    expect(libellesFamilles(dossierPack(racine, "zz")).mathematiques).toContain("pays Z");
    const recrutement = lireRecrutement(dossierPack(racine, "zz"))!;
    expect(recrutement.delaiRelanceJours).toBe(10);
    expect(recrutement.conditionsValidees).not.toBeNull();
    expect(lireRecrutement(dossierPack(racine, "ga"))!.conditionsValidees).toBeNull();
  });

  for (const [code, autre] of [
    ["zz", "ga"],
    ["ga", "zz"],
  ] as const) {
    it(`configure chaque agent du pays ${code} sans aucune valeur du pays ${autre}`, () => {
      const liste = prompts(code);
      for (const [agent, texte] of Object.entries(liste)) {
        expect(texte, agent).not.toMatch(/\{\{[A-Z_]+\}\}/);
        expect(texte, agent).toMatch(MARQUEURS[code]);
        const nettoye = texte.replace(EXEMPLE_DU_PROMPT_CONFORMITE, "");
        expect(nettoye.match(MARQUEURS[autre])?.[0] ?? null, `${agent} (${code})`).toBeNull();
      }
    });
  }
});
