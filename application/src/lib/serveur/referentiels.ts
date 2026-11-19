import "server-only";
import { appellationSeries, type Appellation } from "@/lib/pack-pays/appellation";
import { avecVisiteur } from "./base";

/** Mot qui désigne les séries, par code de référentiel (lu dans la base, venu du pack ; ADR 0111). */
export function appellationsParReferentiel(): Promise<Record<string, Appellation>> {
  return avecVisiteur(async (client) => {
    const { rows } = await client.query(
      "select code, appellation_serie, appellation_series from referentiels",
    );
    return Object.fromEntries(
      rows.map((r) => [r.code, appellationSeries(r.appellation_serie, r.appellation_series)]),
    );
  });
}
