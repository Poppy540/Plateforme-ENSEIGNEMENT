// Masquage des données personnelles dans un texte libre avant de le conserver ou de l'envoyer au modèle
// (revue de sécurité, ADR 0043) : codes, numéros de téléphone ou de carte, adresses email, liens.
export function masquerDonneesSensibles(texte: string): string {
  return texte
    .replace(/\bhttps?:\/\/\S+/gi, "[lien masqué]")
    .replace(/[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi, "[email masqué]")
    .replace(/\+?\b\d(?:[\s.-]?\d){3,18}\b/g, "[masqué]");
}

const MILLIERS = /^\d{1,3}(?:[\s.]\d{3})+$/;

/**
 * Masquage du texte libre d'un élève ou d'un parent avant l'envoi à un agent pédagogique (Professeur, Évaluateur,
 * Tuteur ; ADR 0062). Contrairement à masquerDonneesSensibles, les nombres d'un exercice restent intacts (« 1250 »,
 * « 3,14 », « 1 000 000 ») : seuls ce qui ressemble à un numéro de téléphone (indicatif +, groupes de 2 ou 3
 * chiffres, 8 chiffres ou plus commençant par 0), un email, un lien ou un identifiant technique est masqué.
 */
export function masquerTexteEleve(texte: string): string {
  return masquerCoordonnees(
    texte
      .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, "[lien masqué]")
      .replace(/\bwww\.\S+/gi, "[lien masqué]")
      .replace(
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
        "[identifiant masqué]",
      ),
  );
}

/**
 * Emails et numéros de téléphone seulement (les liens restent) : par exemple pour la preuve d'une condition du
 * pilote, qui peut citer l'adresse du site (ADR 0078). Mêmes règles que masquerTexteEleve pour les nombres.
 */
export function masquerCoordonnees(texte: string): string {
  return texte
    .replace(/[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi, "[email masqué]")
    .replace(/\+\s?\d(?:[\s.-]?\d){7,14}/g, "[numéro masqué]")
    .replace(/\b\d{2,3}(?:[\s.-]\d{2,3}){3,}\b/g, (n) => (MILLIERS.test(n) ? n : "[numéro masqué]"))
    .replace(/\b0\d{7,14}\b/g, "[numéro masqué]");
}
