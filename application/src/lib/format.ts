// Formats d'affichage en français (durées, montants).

/** « 34 s », « 8 min 05 s ». */
export function formaterDuree(secondes: number): string {
  const s = Math.max(0, Math.round(secondes));
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}

const usd = new Intl.NumberFormat("fr", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** « 0,57 USD ». */
export function formaterUSD(montant: number): string {
  return `${usd.format(montant)} USD`;
}

/**
 * Cellule de tableau Markdown : barres obliques inverses puis barres verticales échappées, espaces ramenés à un
 * seul (alerte CodeQL du Jalon 25 : une « \\ » écrite devant une « | » refermait la cellule).
 */
export function celluleMarkdown(texte: string): string {
  return texte.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\s+/g, " ");
}
