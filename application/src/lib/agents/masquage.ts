// Masquage des données personnelles dans un texte libre avant de le conserver ou de l'envoyer au modèle
// (revue de sécurité, ADR 0043) : codes, numéros de téléphone ou de carte, adresses email, liens.
export function masquerDonneesSensibles(texte: string): string {
  return texte
    .replace(/\bhttps?:\/\/\S+/gi, "[lien masqué]")
    .replace(/[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi, "[email masqué]")
    .replace(/\+?\b\d(?:[\s.-]?\d){3,18}\b/g, "[masqué]");
}
