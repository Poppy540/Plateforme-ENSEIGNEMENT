// FAQ du Support, lue dans le pack pays (faq.yaml) : le Support ne répond qu'avec ces entrées.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export interface EntreeFaq {
  id: string;
  question: string;
  reponse: string;
}

export interface Faq {
  statut: string;
  delaiReponseTickets: string | null;
  entrees: EntreeFaq[];
}

export function lireFaq(dossierDuPack: string): Faq {
  const fichier = join(dossierDuPack, "faq.yaml");
  if (!existsSync(fichier)) return { statut: "absente", delaiReponseTickets: null, entrees: [] };
  const brut = parse(readFileSync(fichier, "utf8")) as {
    statut?: string;
    delai_reponse_tickets?: string | null;
    entrees?: Partial<EntreeFaq>[];
  };
  const entrees = (brut.entrees ?? []).filter(
    (e): e is EntreeFaq =>
      typeof e.id === "string" && typeof e.question === "string" && typeof e.reponse === "string",
  );
  if (new Set(entrees.map((e) => e.id)).size !== entrees.length)
    throw new Error("FAQ : identifiants en double.");
  return {
    statut: brut.statut ?? "a_valider",
    delaiReponseTickets: brut.delai_reponse_tickets ?? null,
    entrees,
  };
}
