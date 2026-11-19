// Tarifs indicatifs en USD par million de jetons (à vérifier sur la grille officielle avant décision).
// Écriture en cache (5 minutes) : 1,25 × le prix d'entrée.
export const TARIFS: Record<string, { entree: number; sortie: number; lectureCache: number }> = {
  "claude-opus-5-5": { entree: 4, sortie: 20, lectureCache: 0.2 },
  "claude-sonnet-5-5": { entree: 2, sortie: 10, lectureCache: 0.2 },
  "claude-haiku-4-5": { entree: 1, sortie: 5, lectureCache: 0.1 },
};

export interface Consommation {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function coutUSD(modele: string, c: Consommation): number {
  const t = TARIFS[modele];
  if (!t) return NaN;
  return (
    ((c.input_tokens ?? 0) * t.entree +
      (c.output_tokens ?? 0) * t.sortie +
      (c.cache_read_input_tokens ?? 0) * t.lectureCache +
      (c.cache_creation_input_tokens ?? 0) * t.entree * 1.25) /
    1_000_000
  );
}

/**
 * Estimation avant lancement, hypothèses prudentes à remplacer par la mesure du mini-essai :
 * par tour (message d'élève ou demande de script), prompt lu en cache + 1 500 jetons d'entrée
 * + sortieParTour jetons de sortie, raisonnement compris (2 000 par défaut ; un script en demande bien plus) ;
 * par jugement, entreeJugement jetons d'entrée (2 500 par défaut) + 800 de sortie ; une écriture du prompt en cache.
 */
export function estimerUSD(options: {
  modeleAgent: string;
  modeleJuge: string;
  jetonsPrompt: number;
  toursTotal: number;
  jugements: number;
  sortieParTour?: number;
  entreeJugement?: number;
}): number {
  const parTour = coutUSD(options.modeleAgent, {
    cache_read_input_tokens: options.jetonsPrompt,
    input_tokens: 1500,
    output_tokens: options.sortieParTour ?? 2000,
  });
  const ecritureCache = coutUSD(options.modeleAgent, {
    cache_creation_input_tokens: options.jetonsPrompt,
  });
  const parJugement = coutUSD(options.modeleJuge, {
    input_tokens: options.entreeJugement ?? 2500,
    output_tokens: 800,
  });
  return options.toursTotal * parTour + ecritureCache + options.jugements * parJugement;
}
