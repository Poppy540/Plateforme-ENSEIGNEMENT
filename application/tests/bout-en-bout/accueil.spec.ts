import { expect, test } from "@playwright/test";

test("la page d'accueil s'affiche en français sur téléphone", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("le manifeste de la PWA est servi", async ({ request }) => {
  const reponse = await request.get("/manifest.webmanifest");
  expect(reponse.ok()).toBeTruthy();
  const contenu = await reponse.json();
  expect(contenu.lang).toBe("fr");
});
