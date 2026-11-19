// Fiche de l'avatar d'une unité, lue dans le pack pays (agents/production-video/<unité>.yaml).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import type { FicheAvatar } from "./services.ts";

export class ErreurFiche extends Error {}

export function lireFicheAvatar(dossierDuPack: string, unite: string): FicheAvatar {
  const fichier = join(dossierDuPack, "agents", "production-video", `${unite}.yaml`);
  if (!existsSync(fichier)) throw new ErreurFiche(`Pas de fiche d'avatar pour l'unité ${unite}.`);
  const f = (parse(readFileSync(fichier, "utf8")) as { fiche_avatar?: Partial<FicheAvatar> })
    .fiche_avatar;
  const texte = (v: unknown) => typeof v === "string" && v.trim() !== "";
  if (
    !f ||
    !texte(f.avatar) ||
    !texte(f.voix) ||
    !texte(f.langue) ||
    typeof f.personne_reelle !== "boolean"
  )
    throw new ErreurFiche(`Fiche d'avatar incomplète pour l'unité ${unite}.`);
  return {
    avatar: f.avatar!,
    voix: f.voix!,
    langue: f.langue!,
    description: f.description ?? "",
    personne_reelle: f.personne_reelle,
    autorisation_voix: f.autorisation_voix ?? null,
    autorisation_visage: f.autorisation_visage ?? null,
  };
}
