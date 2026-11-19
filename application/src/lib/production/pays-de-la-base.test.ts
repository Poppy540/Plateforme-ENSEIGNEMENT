import { describe, expect, it } from "vitest";
import { fuseauDuDeploiement, verifierPaysDeLaBase, type PaysEnBase } from "./pays-de-la-base";

// Un déploiement, un pays (ADR 0114) : données FICTIVES.
const y: PaysEnBase = {
  code: "yy",
  nom: "Pays fictif Y",
  fuseau: "Africa/Dakar",
  statut: "en_preparation",
};
const w: PaysEnBase = { code: "ww", nom: "Pays fictif W", fuseau: "Asia/Tokyo", statut: "pilote" };
const z: PaysEnBase = { code: "zz", nom: "Pays fictif Z", fuseau: "UTC", statut: "test" };

describe("fuseau du déploiement", () => {
  it("prend le fuseau de l'unique pays réel, pack de test ignoré", () => {
    expect(fuseauDuDeploiement([y, z])).toEqual({ fuseau: "Africa/Dakar", pays: y });
  });

  it("refuse une base sans pays, ou avec deux pays de fuseaux différents", () => {
    expect(fuseauDuDeploiement([z])).toEqual({
      erreur: "aucun pays importé (pnpm pack:sql, puis psql)",
    });
    expect(fuseauDuDeploiement([y, w])).toEqual({
      erreur:
        "un déploiement sert un pays : 2 pays avec des fuseaux différents (yy Africa/Dakar, ww Asia/Tokyo)",
    });
    // Deux pays au même fuseau : accepté (même journée).
    expect(fuseauDuDeploiement([y, { ...w, fuseau: "Africa/Dakar" }])).toMatchObject({
      fuseau: "Africa/Dakar",
    });
  });
});

describe("vérification de production : pays de la base", () => {
  it("base prête : un pays, aucun pack de test, fuseau réglé", () => {
    expect(verifierPaysDeLaBase([y], "Africa/Dakar").every((c) => c.ok)).toBe(true);
  });

  it("signale un pack de test et un fuseau resté sur celui du serveur", () => {
    const constats = verifierPaysDeLaBase([y, z], "Etc/UTC");
    expect(constats.filter((c) => !c.ok)).toEqual([
      {
        ok: false,
        point: "Aucun pack de test",
        message: "pack de test importé (zz) : base de développement ?",
      },
      {
        ok: false,
        point: "Fuseau de la base",
        message:
          "Etc/UTC au lieu de Africa/Dakar : lancer pnpm base:fuseau, puis redémarrer l'application",
      },
    ]);
  });

  it("sans pays réel, pas de constat de fuseau (rien à comparer)", () => {
    const constats = verifierPaysDeLaBase([], "Etc/UTC");
    expect(constats.map((c) => c.point)).toEqual(["Pays de la base", "Aucun pack de test"]);
    expect(constats[0].ok).toBe(false);
  });
});
