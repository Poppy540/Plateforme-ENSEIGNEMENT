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
});
