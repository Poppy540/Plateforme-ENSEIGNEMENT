import { expect, test } from "@playwright/test";
import { creerAdministrateurFictif, seConnecter } from "../bout-en-bout/outils";

// Capture du Jalon 23 : « Ce qui vous attend » rangé par urgence, avec qui et le temps indicatif (ADR 0116).
// Compte FICTIF. Régénérer : pnpm demo:captures tests/demo/jalon-23.spec.ts
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_23 ?? "../docs/demo/jalon-23";

test.use({ locale: "fr-FR" });

test("ce qui vous attend, par urgence", async ({ page }) => {
  const admin = "+999 000 042 01";
  await creerAdministrateurFictif(admin);
  await seConnecter(page, admin);
  await page.goto("/administration/attentes");
  await expect(
    page.getByRole("heading", { name: "1. Maintenant : ce qui prend le plus de temps" }),
  ).toBeVisible();
  await page.screenshot({ path: `${DOSSIER}/01-attentes-par-urgence.png` });
});
