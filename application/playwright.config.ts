import { defineConfig, devices } from "@playwright/test";

// Navigateur préinstallé dans l'environnement (pas de téléchargement) ; sinon Playwright utilise le sien.
const cheminChromium = process.env.CHEMIN_CHROMIUM;

export default defineConfig({
  testDir: "tests/bout-en-bout",
  outputDir: "tests/resultats",
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    ...devices["Pixel 7"],
    launchOptions: cheminChromium ? { executablePath: cheminChromium } : {},
  },
  webServer: {
    command: "pnpm build && pnpm start --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
