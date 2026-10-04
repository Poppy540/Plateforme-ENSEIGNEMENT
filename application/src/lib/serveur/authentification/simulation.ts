import "server-only";
import { createHash } from "node:crypto";
import type { Identifiant } from "@/lib/identifiants";
import { creerCompteSimule, supprimerCompteSimule } from "../base";
import { simulationAutorisee } from "../configuration";
import type { FournisseurAuthentification } from "./fournisseur";

// Développement et test uniquement : aucun SMS ni email n'est envoyé, le code est toujours CODE_SIMULE.
export const CODE_SIMULE = "123456";

/** Même identifiant => même compte, sans rien stocker en clair. */
function utilisateurSimule(identifiant: Identifiant): string {
  const h = createHash("sha256").update(`${identifiant.type}:${identifiant.valeur}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export const fournisseurSimule: FournisseurAuthentification = {
  async envoyerCode() {
    if (!simulationAutorisee()) throw new Error("Authentification simulée interdite.");
  },
  async verifierCode(identifiant, code) {
    if (!simulationAutorisee()) throw new Error("Authentification simulée interdite.");
    if (code !== CODE_SIMULE) return null;
    const utilisateur = utilisateurSimule(identifiant);
    await creerCompteSimule(utilisateur);
    return utilisateur;
  },
  async supprimerCompte(utilisateur) {
    if (!simulationAutorisee()) throw new Error("Authentification simulée interdite.");
    await supprimerCompteSimule(utilisateur);
  },
};
