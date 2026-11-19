import { describe, expect, it } from "vitest";
import { estSimulee, megaOctetsParMinute, sourcesLecture } from "./lecture";

describe("sources de lecture (faible débit)", () => {
  const versions = [
    { qualite: "720p", debitKbps: 1500 },
    { qualite: "240p", debitKbps: 250 },
    { qualite: "360p", debitKbps: 500 },
  ];

  it("classe les versions de la plus légère à la plus lourde (la première est lue par défaut)", () => {
    const sources = sourcesLecture("simulation://stream/abc", versions)!;
    expect(sources.map((s) => s.qualite)).toEqual(["240p", "360p", "720p"]);
    expect(sources[0].fichiers.map((f) => f.type)).toEqual(["video/webm", "video/mp4"]);
    expect(estSimulee("simulation://stream/abc")).toBe(true);
  });

  it("ne prétend pas lire un hébergeur non branché", () => {
    expect(sourcesLecture("https://hebergeur.example/v/1", versions)).toBeNull();
  });

  it("lit une vidéo Stream en HLS plafonné, avec un MP4 de secours", () => {
    const uid = "0123456789abcdef0123456789abcdef";
    const options = { sousDomaineStream: "customer-abc123.cloudflarestream.com" };
    const sources = sourcesLecture(
      `cloudflare-stream://${uid}`,
      [
        { qualite: "Automatique", debitKbps: 1500 },
        { qualite: "Économie de données", debitKbps: 300 },
      ],
      options,
    )!;
    expect(sources[0].qualite).toBe("Économie de données");
    expect(sources[0].fichiers[0].url).toBe(
      `https://customer-abc123.cloudflarestream.com/${uid}/manifest/video.m3u8?clientBandwidthHint=0.3`,
    );
    expect(sources[0].fichiers[1].type).toBe("video/mp4");
    // Sans sous-domaine valide, ou avec une référence mal formée : rien n'est lu.
    expect(sourcesLecture(`cloudflare-stream://${uid}`, versions)).toBeNull();
    expect(
      sourcesLecture(`cloudflare-stream://${uid}`, versions, { sousDomaineStream: "evil.example" }),
    ).toBeNull();
    expect(sourcesLecture("cloudflare-stream://../x", versions, options)).toBeNull();
  });

  it("indique la consommation de données par minute", () => {
    expect(megaOctetsParMinute(250)).toBe(1.9);
    expect(megaOctetsParMinute(1500)).toBe(11.3);
  });
});
