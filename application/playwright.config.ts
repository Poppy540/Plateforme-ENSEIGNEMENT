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
      URL_BASE_DONNEES: "postgresql://serveur_application@127.0.0.1:54330/postgres",
    },
  },
});
