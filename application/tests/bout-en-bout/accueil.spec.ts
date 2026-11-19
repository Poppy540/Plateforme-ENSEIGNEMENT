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

test("état de service pour la surveillance, sans aucune donnée", async ({ request }) => {
  const reponse = await request.get("/api/sante");
  expect(reponse.status()).toBe(200);
  expect(await reponse.json()).toEqual({ etat: "ok" });
});
