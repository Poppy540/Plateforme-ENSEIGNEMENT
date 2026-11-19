import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Mesure des pages en faible débit (ADR 0098 ; données fictives, base locale réinitialisée) : pnpm mesurer:pages
export default defineConfig({
  ...base,
  testDir: "tests/mesures",
  outputDir: "tests/resultats/mesures",
});
