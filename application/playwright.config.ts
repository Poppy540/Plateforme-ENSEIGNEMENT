import { defineConfig, devices } from "@playwright/test";

// Navigateur préinstallé dans l'environnement (pas de téléchargement) ; sinon Playwright utilise le sien.
const cheminChromium = process.env.CHEMIN_CHROMIUM;

export default defineConfig({
  testDir: "tests/bout-en-bout",
  outputDir: "tests/resultats",
  reporter: "list",
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    ...devices["Pixel 7"],
    launchOptions: cheminChromium ? { executablePath: cheminChromium } : {},
  },
  // Base locale réinitialisée à chaque passage, authentification simulée (aucun SMS envoyé).
  webServer: {
    command: "bash scripts/base-locale.sh reinitialiser && pnpm build && pnpm start --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      ENVIRONNEMENT: "test",
      MODE_AUTH: "simulation",
      MODE_MODELE: "simulation",
      MODE_VIDEO: "simulation",
      MODE_FILE: "immediat",
      // Valeurs de TEST uniquement (aucun secret réel) : exécuteur planifié et liens envoyés.
      JETON_EXECUTEUR: "jeton-de-test-uniquement-pas-un-secret-0000",
      URL_PUBLIQUE: "http://localhost:3100",
      // Contact FICTIF de l'équipe de veille (alertes de priorité 1, ADR 0036).
      CONTACTS_VEILLE: "+999 900 000 01",
      // Les tests se reconnectent souvent avec les mêmes numéros fictifs : limites de connexion relevées.
      CODES_PAR_IDENTIFIANT: "1000",
      CODES_PAR_HEURE: "100000",
      URL_BASE_DONNEES: "postgresql://serveur_application@127.0.0.1:54330/postgres",
    },
  },
});
