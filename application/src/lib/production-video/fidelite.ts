// Contrôle de fidélité (prompt C2, étape 7) : la transcription de la vidéo doit correspondre au script,
// sans ajout ni omission. Mesure : taux d'erreur par mot (distance d'édition entre suites de mots normalisés).

export const SEUIL_ECART = 0.05;

export function mots(texte: string): string[] {
  return texte
    .toLowerCase()
    .normalize("NFC")
    .replace(/\[à vérifier\]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter(Boolean);
}

/** Taux d'erreur par mot de la transcription par rapport au texte attendu (0 = identique). */
export function ecart(attendu: string, transcrit: string): number {
  const a = mots(attendu);
  const b = mots(transcrit);
  if (a.length === 0) return b.length === 0 ? 0 : 1;
  let precedente = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const courante = [i];
    for (let j = 1; j <= b.length; j++) {
      courante[j] = Math.min(
        precedente[j] + 1,
        courante[j - 1] + 1,
        precedente[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    precedente = courante;
  }
  return precedente[b.length] / a.length;
}
