import { cpSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// « Ajouter un pays » guidé (Jalon 22, étape 3 ; ADR 0113) : un nouveau pack part d'une copie du modèle
// `referentiels/_modele/` (sans ses gabarits), avec le code et le nom du pays déjà posés. Rien n'est inventé :
// tout le reste est vide, et `pnpm pack:verifier` dit ce qui manque.

const CODE = /^[a-z]{2}$/;
const DOSSIER = /^[a-z][a-z0-9-]*$/;

export function creerPack(
  referentiels: string,
  dossier: string,
  code: string,
  nom: string,
): string {
  if (!DOSSIER.test(dossier) || dossier.startsWith("_"))
    throw new Error(`Nom de dossier invalide « ${dossier} » (minuscules, chiffres, tirets).`);
  if (!CODE.test(code))
    throw new Error(`Code de pays invalide « ${code} » : deux lettres minuscules (ISO 3166-1).`);
  if (!nom.trim()) throw new Error("Nom du pays manquant.");
  if (/["\\\n]/.test(nom))
    throw new Error("Le nom du pays ne doit contenir ni guillemet ni retour.");
  const cible = join(referentiels, dossier);
  if (existsSync(cible)) throw new Error(`Le dossier ${cible} existe déjà : rien n'est écrasé.`);
  const modele = join(referentiels, "_modele");
  cpSync(modele, cible, {
    recursive: true,
    filter: (source) => !source.startsWith(join(modele, "gabarits")),
  });
  for (const fichier of fichiers(cible)) {
    const texte = readFileSync(fichier, "utf8");
    const rempli = texte.replaceAll("{{CODE_PAYS}}", code).replaceAll("{{NOM_PAYS}}", nom.trim());
    if (rempli !== texte) writeFileSync(fichier, rempli);
  }
  return cible;
}

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    return statSync(chemin).isDirectory() ? fichiers(chemin) : [chemin];
  });
}
