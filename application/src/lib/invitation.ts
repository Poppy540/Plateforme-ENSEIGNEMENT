// Codes d'invitation des enseignants-référents (ADR 0016). Fonctions pures, testables.
import { createHash, randomInt } from "node:crypto";

// Sans caractères ambigus (0/O, 1/I/L) : le code peut être dicté au téléphone.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function genererCodeInvitation(): string {
  const bloc = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${bloc()}-${bloc()}-${bloc()}`;
}

/** Même calcul que la base : SHA-256 du code en majuscules, sans espaces autour. */
export function empreinteCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase(), "utf8").digest("hex");
}

export function invitationEnSql(options: {
  referentiel: string;
  familles: string[];
  empreinte: string;
  joursDeValidite: number;
}): string {
  const texte = (v: string) => `'${v.replaceAll("'", "''")}'`;
  if (options.familles.length === 0)
    throw new Error("Au moins une famille de matières est requise.");
  if (
    !Number.isInteger(options.joursDeValidite) ||
    options.joursDeValidite < 1 ||
    options.joursDeValidite > 60
  ) {
    throw new Error("La durée de validité doit être comprise entre 1 et 60 jours.");
  }
  return `insert into invitations_referents (empreinte_code, referentiel_id, familles, expire_le)
select ${texte(options.empreinte)}, r.id, array[${options.familles.map(texte).join(", ")}]::text[], now() + interval '${options.joursDeValidite} days'
from referentiels r where r.code = ${texte(options.referentiel)}
returning id;
`;
}
