import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Captures d'écran de démonstration (données fictives, base locale réinitialisée) : pnpm demo:captures
export default defineConfig({ ...base, testDir: "tests/demo", outputDir: "tests/resultats/demo" });
