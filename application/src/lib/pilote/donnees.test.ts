import { describe, expect, it } from "vitest";
import { datePrevue, simulerSortDesDonnees } from "./donnees";

describe("sort des données en fin de pilote, simulation (ADR 0086)", () => {
  it("date prévue : dernier jour du pilote + durée ; durée vide : rien n'est effacé", () => {
    expect(datePrevue("2026-10-31", 365)).toBe("31 octobre 2027");
    expect(datePrevue("2026-10-31", null)).toBe("Durée non fixée : rien n'est effacé");
    expect(datePrevue(null, 30)).toBe("Dernier jour du pilote non saisi");
  });

  it("libellés, durées, petits effectifs de personnes masqués, rien à effacer sans durée", () => {
    const lignes = simulerSortDesDonnees(
      [
        { categorie: "echanges", duree_jours: 365, total: 3, a_effacer: 1 },
        { categorie: "comptes_inactifs", duree_jours: 730, total: 3, a_effacer: 0 },
        { categorie: "signalements_traites", duree_jours: null, total: 12, a_effacer: 0 },
      ],
      "2026-10-31",
    );
    expect(lignes[0]).toMatchObject({
      libelle: "Échanges avec le professeur IA",
      duree: "365 jours",
      total: "3",
      aEffacer: "1",
      datePrevue: "31 octobre 2027",
    });
    expect(lignes[1]).toMatchObject({ total: "<5", aEffacer: "0" });
    expect(lignes[2]).toMatchObject({
      duree: "non fixée",
      aEffacer: "—",
      datePrevue: "Durée non fixée : rien n'est effacé",
    });
  });
});
