import { expect, test } from "@playwright/test";
import { inscrireEleveActif } from "../bout-en-bout/outils";

// Capture du Jalon 24 : « Mes données » d'un élève, avec la limite d'un téléphone resté sans réseau (décision
// D17, ADR 0121). Compte FICTIF. Régénérer : pnpm demo:captures tests/demo/jalon-24.spec.ts
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_24 ?? "../docs/demo/jalon-24";

test.use({ locale: "fr-FR" });

test("mes données : téléphone perdu ou resté sans réseau", async ({ page }) => {
  await inscrireEleveActif(page, "+999 000 044 01", "5e");
  await page.goto("/espace/mes-donnees");
  const phrase = page.getByText(/au plus 7\s+jours/);
  await expect(phrase).toBeVisible();
  await page.getByRole("heading", { name: "Mes connexions" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${DOSSIER}/01-mes-connexions.png` });
});
