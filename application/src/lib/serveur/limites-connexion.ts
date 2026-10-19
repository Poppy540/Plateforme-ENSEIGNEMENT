import "server-only";
import { createHash } from "node:crypto";
import type { Identifiant } from "@/lib/identifiants";
import { avecVisiteur } from "./base";
import { selAudit } from "./configuration";

// Limites d'envoi et de vérification des codes de connexion (revue de sécurité, S9 ; ADR 0043), tenues en base.
// Les valeurs par défaut se règlent par l'environnement ; l'identifiant n'est jamais stocké en clair.

function entier(nom: string, defaut: number): number {
  const v = Number(process.env[nom]);
  return Number.isInteger(v) && v > 0 ? v : defaut;
}

/** Empreinte salée (même sel que le journal d'audit) : la table ne permet pas de retrouver un numéro. */
function cle(identifiant: Identifiant): string {
  return createHash("sha256")
    .update(`${selAudit()}:${identifiant.type}:${identifiant.valeur}`)
    .digest("hex");
}

function prendre(cleLimite: string, nature: string, max: number, minutes: number) {
  return avecVisiteur((client) =>
    client
      .query("select limiter_connexion($1, $2, $3, $4) as ok", [cleLimite, nature, max, minutes])
      .then((r) => r.rows[0].ok === true),
  );
}

/** Envoi d'un code : par identifiant (3 par 15 minutes) et pour toute la plateforme (200 par heure). */
export async function envoiAutorise(identifiant: Identifiant): Promise<boolean> {
  return (
    (await prendre(cle(identifiant), "envoi", entier("CODES_PAR_IDENTIFIANT", 3), 15)) &&
    (await prendre("plateforme-entiere-0000", "envoi_global", entier("CODES_PAR_HEURE", 200), 60))
  );
}

/**
 * Vérification d'un code : 5 essais faux par identifiant et par 15 minutes (au-delà, plus aucun code n'est
 * accepté). L'essai est pris avant la vérification, puis rendu si le code est juste.
 */
export function verificationAutorisee(identifiant: Identifiant): Promise<boolean> {
  return prendre(cle(identifiant), "verification", entier("ESSAIS_CODE", 5), 15);
}

export function rendreEssai(identifiant: Identifiant): Promise<void> {
  return avecVisiteur(async (client) => {
    await client.query("select rendre_essai_connexion($1)", [cle(identifiant)]);
  });
}
