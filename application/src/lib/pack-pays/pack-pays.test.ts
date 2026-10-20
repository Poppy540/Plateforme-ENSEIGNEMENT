import { cpSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ErreurPack, lirePack } from "./lecture";
import { packEnSql } from "./sql";

const racine = resolve(__dirname, "../../..");
const packGabon = resolve(racine, "../referentiels/gabon");
const packFictif = resolve(racine, "tests/packs/yy-fictif");
const packInvalide = resolve(racine, "tests/packs/invalide");

describe("lecture d'un pack pays", () => {
  it("lit le pack pilote sans erreur (valeurs attendues = données du pack, pas du code)", () => {
    const pack = lirePack(packGabon);
    expect(pack.pays.code).toBe("ga");
    expect(pack.unites).toHaveLength(67);
    expect(pack.niveaux).toHaveLength(7);
    expect(pack.series).toHaveLength(5);
    expect(pack.programmes["ga-3e-mathematiques"]).toHaveLength(7);
    // Famille Mathématiques, collège et lycée (séries C et D), programmes provisoires, et son graphe proposé.
    expect(Object.keys(pack.programmes).filter((u) => u.endsWith("-mathematiques"))).toHaveLength(
      9,
    );
    expect(pack.programmes["ga-tle-c-mathematiques"].map((c) => c.code)).toContain(
      "nombres-complexes",
    );
    expect(pack.programmes["ga-tle-d-mathematiques"].map((c) => c.code)).not.toContain(
      "nombres-complexes",
    );
    expect(pack.prerequis.length).toBeGreaterThan(0);
    expect(pack.prerequis).toContainEqual({
      chapitre: { unite: "ga-3e-mathematiques", code: "thales" },
      prerequis: { unite: "ga-4e-mathematiques", code: "triangles-semblables" },
      nature: "strict",
    });
    expect(pack.prerequis).toContainEqual({
      chapitre: { unite: "ga-tle-c-mathematiques", code: "logarithme-exponentielle" },
      prerequis: { unite: "ga-1re-c-mathematiques", code: "derivation" },
      nature: "strict",
    });
  });

  it("refuse un prérequis propre à une autre série", () => {
    const dossier = mkdtempSync(join(tmpdir(), "pack-"));
    cpSync(packFictif, dossier, { recursive: true });
    writeFileSync(
      join(dossier, "programmes", "yy-g12-civisme.yaml"),
      'unite: yy-g12-civisme\nchapitres:\n  - { ordre: 1, code: debat, titre: "Débattre" }\n',
    );
    writeFileSync(
      join(dossier, "prerequis", "algebre.yaml"),
      `liens:
  - { chapitre: yy-g12-algebre/fonctions, prerequis: yy-g12-civisme/debat, nature: souple }
`,
    );
    let erreurs: string[] = [];
    try {
      lirePack(dossier);
    } catch (e) {
      erreurs = (e as ErreurPack).erreurs;
    }
    expect(erreurs).toEqual([
      "prerequis/algebre.yaml : prérequis d'une autre série dans yy-g12-algebre/fonctions ← yy-g12-civisme/debat",
    ]);
  });

  it("refuse un graphe de prérequis incohérent (chapitre inconnu, classe supérieure, cycle)", () => {
    const dossier = mkdtempSync(join(tmpdir(), "pack-"));
    cpSync(packFictif, dossier, { recursive: true });
    writeFileSync(
      join(dossier, "prerequis", "algebre.yaml"),
      `liens:
  - { chapitre: yy-g7-algebre/equations, prerequis: yy-g7-algebre/inconnu, nature: strict }
  - { chapitre: yy-g7-algebre/equations, prerequis: yy-g12-algebre/fonctions, nature: strict }
  - { chapitre: yy-g7-algebre/expressions, prerequis: yy-g7-algebre/equations, nature: souple }
  - { chapitre: yy-g7-algebre/equations, prerequis: yy-g7-algebre/expressions, nature: strict }
`,
    );
    let erreurs: string[] = [];
    try {
      lirePack(dossier);
    } catch (e) {
      erreurs = (e as ErreurPack).erreurs;
    }
    expect(erreurs).toEqual(
      expect.arrayContaining([
        "prerequis/algebre.yaml : chapitre inconnu dans yy-g7-algebre/equations ← yy-g7-algebre/inconnu",
        "prerequis/algebre.yaml : prérequis d'une classe supérieure dans yy-g7-algebre/equations ← yy-g12-algebre/fonctions",
        "graphe de prérequis : cycle détecté",
      ]),
    );
  });

  it("charge un pays fictif à la structure différente sans modifier le code", () => {
    const pack = lirePack(packFictif);
    expect(pack.referentiel.code).toBe("yy-general");
    expect(pack.unites.map((u) => u.code)).toEqual([
      "yy-g7-algebre",
      "yy-g12-algebre",
      "yy-g12-civisme",
    ]);
    expect(pack.unites[1].series).toEqual(["SCI", "LIT"]);
    expect(pack.programmes["yy-g7-algebre"][1]).toMatchObject({ volumeHoraire: 6, coefficient: 2 });
    expect(pack.prerequis).toHaveLength(2);
  });

  it("lit les durées de conservation du cadre légal (provisoires pour le pilote)", () => {
    expect(lirePack(packGabon).pays.conservation).toEqual({
      echanges_jours: 365,
      inscription_non_confirmee_jours: 30,
      compte_inactif_jours: 730,
    });
    expect(lirePack(packFictif).pays.conservation.inscription_non_confirmee_jours).toBe(7);
  });

  it("refuse un pack incohérent en listant toutes les erreurs", () => {
    let erreurs: string[] = [];
    try {
      lirePack(packInvalide);
    } catch (e) {
      expect(e).toBeInstanceOf(ErreurPack);
      erreurs = (e as ErreurPack).erreurs;
    }
    expect(erreurs).toEqual(
      expect.arrayContaining([
        "niveau en double : « n1 »",
        "matieres.yaml : couche inconnue pour « m1 »",
        "unites.yaml : niveau inconnu « inexistant » pour u1",
        "unites.yaml : matière inconnue « absente » pour u2",
        "unites.yaml : série inconnue « X » pour u2",
      ]),
    );
  });
});

describe("génération du SQL d'import", () => {
  const sql = packEnSql(lirePack(packFictif));

  it("échappe les apostrophes", () => {
    expect(sql).toContain("'Civisme d''aujourd''hui'");
    expect(sql).toContain("'L''ordre des opérations'");
  });

  it("ne valide jamais rien : aucun statut « valide » n'est écrit", () => {
    expect(sql).not.toMatch(/'valide'/);
    expect(sql).not.toMatch(/statut\s*=/);
  });

  it("est encadré par une transaction", () => {
    expect(sql.trimEnd().endsWith("commit;")).toBe(true);
    expect(sql).toContain("begin;");
  });
});

describe("aucune donnée de pays dans le code (ADR 0001)", () => {
  // Noms propres à des packs : ils ne doivent apparaître que dans referentiels/ et les tests.
  const interdits = [
    /gabon/i,
    /\bBEPC\b/,
    /\bga-[a-z0-9]/,
    /\bA1\b|\bA2\b/,
    /Libreville/i,
    /\+241/,
    /\bXAF\b|franc CFA/i,
  ];

  function fichiers(dossier: string): string[] {
    return readdirSync(dossier).flatMap((nom) => {
      const chemin = join(dossier, nom);
      return statSync(chemin).isDirectory() ? fichiers(chemin) : [chemin];
    });
  }

  it("le code applicatif ne contient aucun nom de pays, de série ni d'examen", () => {
    const sources = [
      ...fichiers(join(racine, "src")),
      ...fichiers(join(racine, "supabase/migrations")),
    ].filter((f) => !f.endsWith(".test.ts"));
    const trouves = sources.flatMap((f) => {
      const contenu = readFileSync(f, "utf8");
      return interdits.filter((motif) => motif.test(contenu)).map((motif) => `${f} : ${motif}`);
    });
    expect(trouves).toEqual([]);
  });
});
