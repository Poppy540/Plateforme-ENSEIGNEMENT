// Batterie VP (cadrage, Partie D3) appliquée à la chaîne programmée : tests déterministes (ADR 0020).
import { describe, expect, it } from "vitest";
import { TYPES_SECTION, type SortieScenariste } from "../agents/scenariste/script";
import {
  produireVideo,
  TENTATIVES_MAX,
  type DemandeProduction,
  type ScriptPourProduction,
} from "./chaine";
import { resolve } from "node:path";
import { ecart } from "./fidelite";
import { ErreurFiche, lireFicheAvatar } from "./fiche";
import type { FicheAvatar, ServicesVideo } from "./services";
import { servicesSimules } from "./simulation";
import { decouperRepliques, sousTitresVtt, texteDesSousTitres } from "./sous-titres";

const texte = (i: number) =>
  `Section ${i + 1}. Dans le triangle ABC, les droites (MN) et (BC) sont parallèles, donc les rapports AM sur AB et AN sur AC sont égaux. Retiens bien cette idée, elle sert dans tous les exercices du chapitre.`;

function contenu(): SortieScenariste {
  return {
    decision: "script",
    message_au_referent: "",
    a_relire_en_priorite: false,
    motif_priorite: "",
    sections: TYPES_SECTION.map((type, i) => ({
      type,
      titre: type,
      debut_secondes: 0,
      duree_secondes: 15,
      texte_parle: texte(i),
      indications_visuelles: "Figure de Thalès",
    })),
    travaux_pratiques: { consignes: [], materiel: [], securite: [] },
    idees_questions_controle: [],
    glossaire: [],
    points_a_verifier: [],
    exemples_locaux_a_valider: [],
    signalements_programme: [],
  };
}

const script = (modif: Partial<ScriptPourProduction> = {}): ScriptPourProduction => ({
  id: "00000000-0000-4000-8000-000000000001",
  statut: "valide",
  version: 2,
  empreinte: "abc",
  empreinteRecalculee: "abc",
  versionValidee: 2,
  empreinteValidee: "abc",
  dureeCibleMinutes: 2,
  contenu: contenu(),
  ...modif,
});

const fiche: FicheAvatar = {
  avatar: "avatar-catalogue-1",
  voix: "voix-synthese-fr-1",
  langue: "fr",
  description: "Avatar synthétique du catalogue",
  personne_reelle: false,
  autorisation_voix: null,
  autorisation_visage: null,
};

/** Services simulés qui comptent les appels payants (pour vérifier qu'aucune dépense n'a lieu). */
function espionner(services: ServicesVideo) {
  const appels = { voix: 0, avatar: 0, depot: 0 };
  return {
    appels,
    services: {
      ...services,
      voix: (...a: Parameters<ServicesVideo["voix"]>) => (appels.voix++, services.voix(...a)),
      avatar: (...a: Parameters<ServicesVideo["avatar"]>) => (
        appels.avatar++,
        services.avatar(...a)
      ),
      deposer: (...a: Parameters<ServicesVideo["deposer"]>) => (
        appels.depot++,
        services.deposer(...a)
      ),
    } as ServicesVideo,
  };
}

const demande = (modif: Partial<DemandeProduction> = {}): DemandeProduction => ({
  script: script(),
  versionDemandee: 2,
  empreinteDemandee: "abc",
  fiche,
  budgetUSD: 5,
  services: servicesSimules(),
  autorisationActive: async () => false,
  ...modif,
});

describe("batterie VP — chaîne de production vidéo", () => {
  it("VP-01 script validé conforme : chaîne complète jusqu'au dépôt, rapport avec contrôles et coût, jamais publiée", async () => {
    const r = await produireVideo(demande());
    expect(r.resultat).toBe("deposee");
    expect(r.etapes.every((e) => e.statut === "ok")).toBe(true);
    expect(r.segments).toHaveLength(8);
    expect(r.fichiers?.versions.some((v) => v.debitKbps <= 500)).toBe(true);
    expect(r.coutUSD).toBeGreaterThan(0);
    expect(r.controles.map((c) => c.controle)).toEqual(
      expect.arrayContaining([
        "duree",
        "fidelite",
        "synchronisation",
        "volume",
        "lisibilite_ecran",
      ]),
    );
    expect(JSON.stringify(r)).not.toMatch(/publi/i);
  });

  it("VP-02 script non validé : refus, aucune dépense", async () => {
    const { services, appels } = espionner(servicesSimules());
    const r = await produireVideo(
      demande({
        services,
        script: script({ statut: "brouillon", versionValidee: null, empreinteValidee: null }),
      }),
    );
    expect(r.resultat).toBe("refusee");
    expect(r.etapes[0]).toMatchObject({ etape: "verification_script", statut: "echec" });
    expect(appels).toEqual({ voix: 0, avatar: 0, depot: 0 });
  });

  it("VP-03 script modifié après validation (empreinte différente) : refus et écart signalé", async () => {
    for (const modif of [
      { empreinteRecalculee: "modifie" },
      { empreinteValidee: "ancienne" },
      { versionValidee: 1 },
    ]) {
      const { services, appels } = espionner(servicesSimules());
      const r = await produireVideo(demande({ services, script: script(modif) }));
      expect(r.resultat).toBe("refusee");
      expect(r.escalades[0]).toMatch(/empreinte différente/);
      expect(appels.voix).toBe(0);
    }
    const r = await produireVideo(demande({ empreinteDemandee: "autre" }));
    expect(r.resultat).toBe("refusee");
  });

  it("VP-04 transcription différente du script : régénère le segment ; escalade si l'écart persiste", async () => {
    const corrige = await produireVideo(
      demande({ services: servicesSimules({ transcriptionAlteree: { segment: 2, fois: 1 } }) }),
    );
    expect(corrige.resultat).toBe("deposee");
    expect(corrige.segments[2].tentatives).toBe(2);
    expect(corrige.anomalies[0]).toMatch(/Segment 3, tentative 1 : écart de fidélité/);

    const { services, appels } = espionner(
      servicesSimules({ transcriptionAlteree: { segment: 2, fois: 10 } }),
    );
    const persistant = await produireVideo(demande({ services }));
    expect(persistant.resultat).toBe("arretee");
    expect(persistant.escalades[0]).toMatch(/Segment 3 : écart de fidélité .* après 3 tentatives/);
    expect(persistant.fichiers).toBeNull();
    expect(appels.depot).toBe(0);
  });

  it("VP-05 voix ou visage d'une personne réelle sans autorisation enregistrée : refus", async () => {
    const reelle = {
      ...fiche,
      personne_reelle: true,
      autorisation_voix: "a1",
      autorisation_visage: null,
    };
    const r = await produireVideo(demande({ fiche: reelle, autorisationActive: async () => true }));
    expect(r.resultat).toBe("refusee");
    expect(r.escalades[0]).toMatch(/sans autorisation écrite/);
    const revoquee = await produireVideo(
      demande({
        fiche: { ...reelle, autorisation_visage: "a2" },
        autorisationActive: async (id) => id === "a1",
      }),
    );
    expect(revoquee.resultat).toBe("refusee");
    const autorisee = await produireVideo(
      demande({
        fiche: { ...reelle, autorisation_visage: "a2" },
        autorisationActive: async () => true,
      }),
    );
    expect(autorisee.resultat).toBe("deposee");
  });

  it("VP-06 coût au-delà du budget : refus avant dépense, ou arrêt dès le dépassement, et alerte", async () => {
    const { services, appels } = espionner(servicesSimules());
    const avant = await produireVideo(demande({ services, budgetUSD: 0.01 }));
    expect(avant.resultat).toBe("refusee");
    expect(avant.escalades[0]).toMatch(/supérieur au budget/);
    expect(appels.voix).toBe(0);

    const pendant = await produireVideo(
      demande({ services: servicesSimules({ multiplicateurCout: 20 }), budgetUSD: 3 }),
    );
    expect(pendant.resultat).toBe("arretee");
    expect(pendant.escalades[0]).toMatch(/Budget dépassé/);
    // Arrêt au premier appel qui dépasse : le dépassement est d'un seul appel au plus.
    expect(pendant.coutUSD).toBeLessThan(3 + 20 * 0.25);
    expect(pendant.fichiers).toBeNull();
  });

  it("VP-07 le texte n'est jamais modifié : sous-titres identiques au texte validé, aucun moyen de le corriger", async () => {
    const r = await produireVideo(demande());
    const attendu = contenu()
      .sections.map((x) => x.texte_parle)
      .join(" ");
    expect(texteDesSousTitres(r.sousTitresVtt!)).toBe(attendu.replace(/\s+/g, " "));
    // La demande de production n'a aucun champ de texte : seule une nouvelle version validée change le texte.
    expect(Object.keys(demande())).not.toContain("texte");
  });

  it("VP-08 un outil échoue quatre fois de suite : trois tentatives au plus, puis escalade", async () => {
    const { services, appels } = espionner(servicesSimules({ echecsVoix: 4 }));
    const r = await produireVideo(demande({ services }));
    expect(r.resultat).toBe("arretee");
    expect(appels.voix).toBe(TENTATIVES_MAX);
    expect(r.escalades[0]).toMatch(/Segment 1 : échec d'un service .* après 3 tentatives/);
  });
});

describe("sous-titres et fidélité", () => {
  it("découpe en répliques de deux lignes au plus, minutées dans la durée du segment", () => {
    const repliques = decouperRepliques(texte(0));
    expect(repliques.every((r) => r.length <= 84)).toBe(true);
    expect(repliques.join(" ")).toBe(texte(0));
    const vtt = sousTitresVtt([{ texte: "Bonjour. Au revoir.", dureeSecondes: 4 }]);
    expect(vtt).toBe(
      "WEBVTT\n\n1\n00:00:00.000 --> 00:00:01.333\nBonjour.\n\n2\n00:00:01.333 --> 00:00:04.000\nAu revoir.\n",
    );
  });

  it("mesure l'écart par mot, sans tenir compte de la ponctuation ni de la casse", () => {
    expect(ecart("Bonjour, les élèves !", "bonjour les élèves")).toBe(0);
    expect(ecart("un deux trois quatre", "un deux quatre")).toBe(0.25);
    expect(ecart("un deux", "un deux trois quatre")).toBe(1);
  });
});

describe("fiche de l'avatar (pack pays)", () => {
  it("l'unité pilote a une fiche complète, avatar et voix synthétiques, sans personne réelle", () => {
    const pack = resolve(__dirname, "../../../../referentiels/gabon");
    const f = lireFicheAvatar(pack, "ga-3e-mathematiques");
    expect(f).toMatchObject({ personne_reelle: false, autorisation_voix: null, langue: "fr" });
    expect(() => lireFicheAvatar(pack, "ga-3e-francais")).toThrow(ErreurFiche);
  });
});
