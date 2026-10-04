// Identifiants de connexion : numéro de téléphone (principal) ou adresse email (secours). ADR 0003.

export type Identifiant = { type: "telephone"; valeur: string } | { type: "email"; valeur: string };

/** Numéro au format international (E.164) : « + », indicatif du pays, puis le numéro. */
export function normaliserTelephone(saisie: string): string | null {
  const nettoye = saisie.replace(/[\s.\-()]/g, "").replace(/^00/, "+");
  return /^\+[1-9]\d{7,14}$/.test(nettoye) ? nettoye : null;
}

export function normaliserEmail(saisie: string): string | null {
  const nettoye = saisie.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nettoye) && nettoye.length <= 254 ? nettoye : null;
}

/** Reconnaît un numéro ou une adresse email ; null si la saisie n'est ni l'un ni l'autre. */
export function lireIdentifiant(saisie: string): Identifiant | null {
  if (saisie.includes("@")) {
    const email = normaliserEmail(saisie);
    return email ? { type: "email", valeur: email } : null;
  }
  const telephone = normaliserTelephone(saisie);
  return telephone ? { type: "telephone", valeur: telephone } : null;
}

export function codeValide(saisie: string): string | null {
  const code = saisie.replace(/\s/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}

/** Version masquée pour l'affichage et les journaux (jamais l'identifiant complet). */
export function masquer(identifiant: Identifiant): string {
  if (identifiant.type === "telephone") {
    const v = identifiant.valeur;
    return `${v.slice(0, 4)}${"•".repeat(Math.max(v.length - 6, 0))}${v.slice(-2)}`;
  }
  const [nom, domaine] = identifiant.valeur.split("@");
  return `${nom.slice(0, 1)}•••@${domaine}`;
}
