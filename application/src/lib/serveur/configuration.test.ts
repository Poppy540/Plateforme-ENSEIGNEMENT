import { afterEach, describe, expect, it, vi } from "vitest";
import {
  modeAuthentification,
  secretSession,
  simulationAutorisee,
  urlPublique,
} from "./configuration";

afterEach(() => vi.unstubAllEnvs());

describe("garde-fous de configuration", () => {
  it("sans environnement déclaré, on se comporte comme en production", () => {
    vi.stubEnv("ENVIRONNEMENT", "");
    expect(simulationAutorisee()).toBe(false);
  });

  it("refuse l'authentification simulée en production", () => {
    vi.stubEnv("ENVIRONNEMENT", "production");
    vi.stubEnv("MODE_AUTH", "simulation");
    expect(() => modeAuthentification()).toThrow(/interdit/);
  });

  it("autorise la simulation en développement", () => {
    vi.stubEnv("ENVIRONNEMENT", "developpement");
    vi.stubEnv("MODE_AUTH", "simulation");
    expect(modeAuthentification()).toBe("simulation");
  });

  it("exige un secret de session d'au moins 32 caractères en production", () => {
    vi.stubEnv("ENVIRONNEMENT", "production");
    vi.stubEnv("SECRET_SESSION", "");
    expect(() => secretSession()).toThrow(/manquant/);
    vi.stubEnv("SECRET_SESSION", "court");
    expect(() => secretSession()).toThrow(/32/);
  });

  it("n'utilise jamais l'adresse de la requête pour les liens en production", () => {
    vi.stubEnv("ENVIRONNEMENT", "production");
    vi.stubEnv("URL_PUBLIQUE", "");
    expect(() => urlPublique("http://site-pirate.exemple")).toThrow(/URL_PUBLIQUE/);
  });

  it("refuse la simulation sur un serveur accessible depuis Internet, même en « test »", () => {
    vi.stubEnv("ENVIRONNEMENT", "test");
    vi.stubEnv("URL_PUBLIQUE", "https://plateforme.exemple");
    expect(simulationAutorisee()).toBe(false);
    vi.stubEnv("URL_PUBLIQUE", "http://localhost:3100");
    expect(simulationAutorisee()).toBe(true);
  });

  it("refuse un secret de session recopié du modèle ou trop peu aléatoire en production", () => {
    vi.stubEnv("ENVIRONNEMENT", "production");
    vi.stubEnv("SECRET_SESSION", "remplacer-moi-par-au-moins-32-caracteres-aleatoires");
    expect(() => secretSession()).toThrow(/modèle/);
    vi.stubEnv("SECRET_SESSION", "a".repeat(40));
    expect(() => secretSession()).toThrow(/aléatoire/);
    vi.stubEnv("SECRET_SESSION", "Zq7-vP2!mK9#tR4$wX8&nB3*hL6@jD1^cF5");
    expect(secretSession()).toHaveLength(35);
  });
});
