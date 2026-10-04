import { readFileSync, readdirSync, statSync } from "node:fs";
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
