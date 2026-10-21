import { describe, expect, it } from "vitest";
import { ErreurFournisseurVideo, servicesReels, type Fetch } from "./fournisseurs";
import type { FicheAvatar } from "./services";

// Tests de contrat (ADR 0055), sans réseau : requêtes envoyées, attente des tâches, erreurs sans secret.
const JETON_AVATAR = "jeton-avatar-fictif";
const JETON_STREAM = "jeton-stream-fictif";
const UID = "0123456789abcdef0123456789abcdef";
const fiche: FicheAvatar = {
  avatar: "avatar-catalogue",
  voix: "voix-fr",
  langue: "fr",
  description: "fictif",
  personne_reelle: false,
  autorisation_voix: null,
  autorisation_visage: null,
};
const sansAttente = { intervalleMs: 0, essaisMax: 3, attendre: async () => undefined };

type Appel = { url: string; methode: string; corps: unknown; autorisation: string | null };

/** Faux fournisseur : réponses par « méthode + fin d'adresse », journal des appels. */
function faux(reponses: Record<string, unknown[]>, appels: Appel[] = []): Fetch {
  return async (url, init) => {
    const methode = init.method ?? "GET";
    appels.push({
      url,
      methode,
      corps: init.body ? JSON.parse(String(init.body)) : null,
      autorisation: new Headers(init.headers).get("authorization"),
    });
    const cle = Object.keys(reponses).find((k) => {
      const [m, fin] = k.split(" ");
      return m === methode && url.endsWith(fin);
    });
    const file = cle ? reponses[cle] : undefined;
    const r = file && file.length > 1 ? file.shift() : file?.[0];
    if (r === undefined) return new Response("{}", { status: 404 });
    if (typeof r === "number") return new Response("{}", { status: r });
    return Response.json(r);
  };
}

const services = (f: Fetch) =>
  servicesReels(
    { url: "https://avatar.example/v1/", jeton: JETON_AVATAR, coutMinuteUSD: 1.2 },
    { compte: "compte-fictif", jeton: JETON_STREAM },
    f,
    sansAttente,
  );

describe("passerelle d'avatar", () => {
  it("envoie le texte et la fiche, attend la tâche, rend la vidéo et son coût", async () => {
    const appels: Appel[] = [];
    const s = services(
      faux(
        {
          "POST /videos": [{ id: "t1" }],
          "GET /videos/t1": [
            { statut: "en_cours" },
            {
              statut: "pret",
              url: "https://cdn.example/t1.mp4",
              duree_secondes: 42,
              cout_usd: 0.8,
            },
          ],
        },
        appels,
      ),
    );
    const voix = await s.voix(0, "Bonjour, aujourd'hui les puissances.", fiche);
    expect(voix.coutUSD).toBe(0);
    const video = await s.avatar(voix, fiche, "tableau");
    expect(video).toEqual({
      segment: 0,
      video: "https://cdn.example/t1.mp4",
      dureeSecondes: 42,
      coutUSD: 0.8,
    });
    expect(appels[0]).toMatchObject({
      url: "https://avatar.example/v1/videos",
      methode: "POST",
      autorisation: `Bearer ${JETON_AVATAR}`,
      corps: {
        texte: "Bonjour, aujourd'hui les puissances.",
        avatar: "avatar-catalogue",
        voix: "voix-fr",
        langue: "fr",
        indications: "tableau",
      },
    });
    expect(appels.filter((a) => a.url.endsWith("/videos/t1"))).toHaveLength(2);
    expect(s.estimerSegment("un deux trois quatre cinq six sept huit neuf dix")).toBeCloseTo(
      (4 / 60) * 1.2,
    );
  });

  it("arrête sur un échec, un délai dépassé, une adresse non https ; sans jamais montrer le jeton", async () => {
    const voix = { segment: 0, audio: "texte://1", dureeSecondes: 3, coutUSD: 0 };
    const cas: Record<string, unknown[]>[] = [
      { "POST /videos": [{ id: "t" }], "GET /videos/t": [{ statut: "echec" }] },
      { "POST /videos": [{ id: "t" }], "GET /videos/t": [{ statut: "en_cours" }] },
      {
        "POST /videos": [{ id: "t" }],
        "GET /videos/t": [{ statut: "pret", url: "http://x/t.mp4" }],
      },
      { "POST /videos": [401] },
      { "POST /videos": [503] },
    ];
    const attendues = ["refuse", "delai", "refuse", "configuration", "temporaire"];
    for (const [i, r] of cas.entries()) {
      const erreur = await services(faux(r))
        .avatar(voix, fiche, "")
        .catch((e: unknown) => e);
      expect(erreur).toBeInstanceOf(ErreurFournisseurVideo);
      expect((erreur as ErreurFournisseurVideo).categorie).toBe(attendues[i]);
      expect(String((erreur as Error).message)).not.toContain(JETON_AVATAR);
    }
  });

  it("transcrit une vidéo pour le contrôle de fidélité", async () => {
    const s = services(faux({ "POST /transcriptions": [{ texte: "Bonjour", cout_usd: 0.01 }] }));
    expect(
      await s.transcrire({
        segment: 0,
        video: "https://cdn.example/t1.mp4",
        dureeSecondes: 3,
        coutUSD: 0,
      }),
    ).toEqual({ texte: "Bonjour", coutUSD: 0.01 });
  });
});

describe("dépôt sur Cloudflare Stream", () => {
  const segments = [
    { segment: 0, video: "https://cdn.example/a.mp4", dureeSecondes: 60, coutUSD: 1 },
    { segment: 1, video: "https://cdn.example/b.mp4", dureeSecondes: 60, coutUSD: 1 },
  ];

  it("assemble, copie dans Stream, attend la préparation, active le MP4 de secours", async () => {
    const appels: Appel[] = [];
    const s = services(
      faux(
        {
          "POST /assemblages": [{ id: "as1" }],
          "GET /assemblages/as1": [
            { statut: "pret", url: "https://cdn.example/cours.mp4", cout_usd: 0.1 },
          ],
          "POST /stream/copy": [{ success: true, result: { uid: UID } }],
          [`GET /stream/${UID}`]: [
            { success: true, result: { readyToStream: false, status: { state: "inprogress" } } },
            { success: true, result: { readyToStream: true, duration: 120 } },
          ],
          [`POST /stream/${UID}/downloads`]: [{ success: true, result: {} }],
        },
        appels,
      ),
    );
    const depot = await s.deposer(segments, "WEBVTT");
    expect(depot.reference).toBe(`cloudflare-stream://${UID}`);
    expect(depot.versions.some((v) => v.debitKbps <= 500)).toBe(true);
    expect(depot.coutUSD).toBeCloseTo(0.1 + 2 * 0.005);
    const copie = appels.find((a) => a.url.endsWith("/stream/copy"))!;
    expect(copie.url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/compte-fictif/stream/copy",
    );
    expect(copie.autorisation).toBe(`Bearer ${JETON_STREAM}`);
    expect(copie.corps).toMatchObject({
      url: "https://cdn.example/cours.mp4",
      requireSignedURLs: false,
    });
    expect(appels.find((a) => a.url.endsWith("/assemblages"))!.corps).toEqual({
      videos: ["https://cdn.example/a.mp4", "https://cdn.example/b.mp4"],
    });
  });

  it("refuse un identifiant Stream mal formé et arrête si la préparation échoue", async () => {
    const un = [segments[0]];
    const malForme = services(
      faux({ "POST /stream/copy": [{ success: true, result: { uid: "../x" } }] }),
    );
    await expect(malForme.deposer(un, "")).rejects.toMatchObject({ categorie: "refuse" });
    const echec = services(
      faux({
        "POST /stream/copy": [{ success: true, result: { uid: UID } }],
        [`GET /stream/${UID}`]: [{ success: true, result: { status: { state: "error" } } }],
      }),
    );
    await expect(echec.deposer(un, "")).rejects.toMatchObject({
      etape: "hebergement",
      categorie: "refuse",
    });
  });
});

describe("chaîne complète avec les adaptateurs réels (faux réseau)", () => {
  it("produit une vidéo « à relire » hébergée sur Stream, sans dépasser le budget", async () => {
    const { produireVideo } = await import("./chaine");
    const { TYPES_SECTION } = await import("../agents/scenariste/script");
    // La passerelle rend, à la transcription, exactement le texte envoyé pour chaque segment.
    const textes = new Map<string, string>();
    let n = 0;
    const fetchFn: Fetch = async (url, init) => {
      const corps = init.body ? JSON.parse(String(init.body)) : {};
      if (url.endsWith("/videos")) {
        textes.set(`v${++n}`, corps.texte);
        return Response.json({ id: `v${n}` });
      }
      const video = /\/videos\/(v\d+)$/.exec(url)?.[1];
      if (video)
        return Response.json({
          statut: "pret",
          url: `https://cdn.example/${video}.mp4`,
          duree_secondes: 15,
          cout_usd: 0.25,
        });
      if (url.endsWith("/transcriptions")) {
        const id = /\/(v\d+)\.mp4$/.exec(corps.url_video)![1];
        return Response.json({ texte: textes.get(id), cout_usd: 0 });
      }
      if (url.endsWith("/assemblages")) return Response.json({ id: "a1" });
      if (url.endsWith("/assemblages/a1"))
        return Response.json({ statut: "pret", url: "https://cdn.example/cours.mp4" });
      if (url.endsWith("/stream/copy"))
        return Response.json({ success: true, result: { uid: UID } });
      if (url.endsWith(`/stream/${UID}`))
        return Response.json({ success: true, result: { readyToStream: true, duration: 120 } });
      if (url.endsWith("/downloads")) return Response.json({ success: true, result: {} });
      return new Response("{}", { status: 404 });
    };
    const texte = (i: number) =>
      `Section ${i + 1}. Les puissances de dix permettent d'écrire les très grands et les très petits nombres. Retiens la règle des exposants.`;
    const rapport = await produireVideo({
      script: {
        id: "00000000-0000-4000-8000-000000000001",
        statut: "valide",
        version: 1,
        empreinte: "e",
        empreinteRecalculee: "e",
        versionValidee: 1,
        empreinteValidee: "e",
        dureeCibleMinutes: 2,
        contenu: {
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
            indications_visuelles: "",
          })),
          travaux_pratiques: { consignes: [], materiel: [], securite: [] },
          idees_questions_controle: [],
          glossaire: [],
          points_a_verifier: [],
          exemples_locaux_a_valider: [],
          signalements_programme: [],
        },
      },
      versionDemandee: 1,
      empreinteDemandee: "e",
      fiche,
      budgetUSD: 15,
      services: services(fetchFn),
      autorisationActive: async () => false,
    });
    expect(rapport.resultat).toBe("deposee");
    expect(rapport.services).toBe("avatar-http+cloudflare-stream");
    expect(rapport.fichiers?.reference).toBe(`cloudflare-stream://${UID}`);
    expect(rapport.coutUSD).toBeLessThanOrEqual(15);
    expect(rapport.escalades).toEqual([]);
  });
});
