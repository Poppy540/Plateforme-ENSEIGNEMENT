import type { Constat } from "./verification.ts";

// Un déploiement sert un pays (Jalon 22, étape 4 ; ADR 0114). La journée des quotas, des limites et des chiffres
// du pilote est celle de l'horloge de la base : son fuseau doit être celui du pays (`pnpm base:fuseau`). Fonctions
// pures ; la lecture de la base est faite par les scripts.

export interface PaysEnBase {
  code: string;
  nom: string;
  fuseau: string;
  statut: string;
}

/** Fuseau à donner à la base : celui de l'unique pays réel importé, sinon la raison du refus. */
export function fuseauDuDeploiement(
  pays: readonly PaysEnBase[],
): { fuseau: string; pays: PaysEnBase } | { erreur: string } {
  const reels = pays.filter((p) => p.statut !== "test");
  if (reels.length === 0) return { erreur: "aucun pays importé (pnpm pack:sql, puis psql)" };
  const fuseaux = [...new Set(reels.map((p) => p.fuseau))];
  if (fuseaux.length > 1)
    return {
      erreur: `un déploiement sert un pays : ${reels.length} pays avec des fuseaux différents (${reels.map((p) => `${p.code} ${p.fuseau}`).join(", ")})`,
    };
  return { fuseau: fuseaux[0], pays: reels[0] };
}

/** Constats de `pnpm verifier:production` sur la base : pays importés, aucun pack de test, fuseau réglé. */
export function verifierPaysDeLaBase(pays: readonly PaysEnBase[], fuseauBase: string): Constat[] {
  const constats: Constat[] = [];
  const choix = fuseauDuDeploiement(pays);
  constats.push(
    "erreur" in choix
      ? { ok: false, point: "Pays de la base", message: choix.erreur }
      : {
          ok: true,
          point: "Pays de la base",
          message: pays
            .filter((p) => p.statut !== "test")
            .map((p) => `${p.nom} (${p.code})`)
            .join(", "),
        },
  );
  const tests = pays.filter((p) => p.statut === "test");
  constats.push(
    tests.length > 0
      ? {
          ok: false,
          point: "Aucun pack de test",
          message: `pack de test importé (${tests.map((p) => p.code).join(", ")}) : base de développement ?`,
        }
      : { ok: true, point: "Aucun pack de test", message: "aucun" },
  );
  if (!("erreur" in choix))
    constats.push(
      fuseauBase === choix.fuseau
        ? { ok: true, point: "Fuseau de la base", message: choix.fuseau }
        : {
            ok: false,
            point: "Fuseau de la base",
            message: `${fuseauBase} au lieu de ${choix.fuseau} : lancer pnpm base:fuseau, puis redémarrer l'application`,
          },
    );
  return constats;
}
