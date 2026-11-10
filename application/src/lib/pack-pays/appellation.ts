// Le mot qui désigne les séries d'un pays (« série », « option », « filière »…) vient du pack
// (`appellation_series` de structure.yaml ; Jalon 22, ADR 0111). Sans lui, le mot générique ci-dessous.

export interface Appellation {
  singulier: string;
  pluriel: string;
}

/** Mot générique, utilisé seulement quand le pack n'en donne pas. */
export const APPELLATION_PAR_DEFAUT: Appellation = { singulier: "série", pluriel: "séries" };

export function appellationSeries(
  singulier: string | null | undefined,
  pluriel: string | null | undefined,
): Appellation {
  return singulier && pluriel ? { singulier, pluriel } : APPELLATION_PAR_DEFAUT;
}

/** « Série », « Option »… en tête de phrase ou d'étiquette. */
export function capitale(mot: string): string {
  return mot.charAt(0).toUpperCase() + mot.slice(1);
}
