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

/** Classe du pilote (ADR 0063) : code de classe pour les élèves et invitation de son enseignant, en empreintes. */
export function classeEnSql(options: {
  referentiel: string;
  niveau: string;
  serie: string | null;
  nom: string;
  etablissement: string;
  empreinteClasse: string;
  empreinteEnseignant: string;
  joursCodeClasse: number;
  joursInvitation: number;
}): string {
  const texte = (v: string) => `'${v.replaceAll("'", "''")}'`;
  const nom = options.nom.trim();
  const etablissement = options.etablissement.trim();
  if (nom.length < 1 || nom.length > 60) throw new Error("Nom de classe : 1 à 60 caractères.");
  if (etablissement.length < 1 || etablissement.length > 120)
    throw new Error("Établissement : 1 à 120 caractères.");
  for (const [jours, max] of [
    [options.joursCodeClasse, 365],
    [options.joursInvitation, 60],
  ])
    if (!Number.isInteger(jours) || jours < 1 || jours > max)
      throw new Error(`La durée de validité doit être comprise entre 1 et ${max} jours.`);
  const serie = options.serie
    ? `(select s.id from series s where s.referentiel_id = r.id and s.code = ${texte(options.serie)})`
    : "null";
  return `with classe as (
  insert into classes (referentiel_id, niveau_id, serie_id, nom, etablissement, empreinte_code, code_expire_le)
  select r.id, n.id, ${serie}, ${texte(nom)}, ${texte(etablissement)}, ${texte(options.empreinteClasse)}, now() + interval '${options.joursCodeClasse} days'
  from referentiels r join niveaux n on n.referentiel_id = r.id and n.code = ${texte(options.niveau)}
  where r.code = ${texte(options.referentiel)}
  returning id
)
insert into invitations_enseignants (empreinte_code, classe_id, expire_le)
select ${texte(options.empreinteEnseignant)}, id, now() + interval '${options.joursInvitation} days' from classe
returning classe_id;
`;
}
