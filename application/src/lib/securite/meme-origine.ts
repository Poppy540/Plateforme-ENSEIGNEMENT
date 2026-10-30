// Demande venue de la plateforme elle-même (revue du Jalon 16, S4 ; ADR 0092) : sert à ne pas compter comme un
// geste de l'administrateur une requête déclenchée depuis un autre site (le cookie de session, SameSite=Lax, suit
// un lien de premier niveau). Fonction pure.

/** En-tête Sec-Fetch-Site du navigateur ; à défaut, Referer de la même origine que la requête. */
export function demandeDeLaPlateforme(requete: Request): boolean {
  const site = requete.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const referer = requete.headers.get("referer");
  try {
    return referer !== null && new URL(referer).origin === new URL(requete.url).origin;
  } catch {
    return false;
  }
}
