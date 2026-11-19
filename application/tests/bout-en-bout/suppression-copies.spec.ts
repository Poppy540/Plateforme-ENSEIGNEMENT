import { expect, test, type Page } from "@playwright/test";
import { inscrireEleveActif } from "./outils";

// Revue du Jalon 24, S10 : supprimer son compte efface aussi ce que le téléphone gardait pour la lecture sans
// réseau (pages, questions en attente), comme la déconnexion. Données FICTIVES.
const ELEVE = "+999 000 043 01";

const gardes = (page: Page) =>
  page.evaluate(async () => {
    const chemins: string[] = [];
    for (const nom of (await caches.keys()).filter((n) => n.startsWith("chapitres-")))
      for (const r of await (await caches.open(nom)).keys()) chemins.push(new URL(r.url).pathname);
    return chemins.sort();
  });

test("la suppression du compte efface les copies gardées sur le téléphone", async ({ page }) => {
  await inscrireEleveActif(page, ELEVE, "5e");
  await page.goto("/catalogue");
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  await page.goto("/espace/plan");
  await expect.poll(() => gardes(page)).toContain("/espace/plan");
  await page.evaluate(() => localStorage.setItem("plateforme:question-en-attente", "fictif"));

  await page.goto("/espace/mes-donnees");
  await page.getByLabel("Pour confirmer, écris SUPPRIMER").fill("SUPPRIMER");
  await page.getByRole("button", { name: "Supprimer définitivement mon compte" }).click();
  await expect(page).toHaveURL(/\/\?compte=supprime$/);
  await expect(page.getByRole("status")).toContainText("Ton compte et toutes tes données");
  await expect.poll(() => gardes(page)).toEqual([]);
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((c) => c.startsWith("plateforme:"))),
  ).toEqual([]);
});
