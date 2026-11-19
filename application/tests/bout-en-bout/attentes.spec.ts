import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { creerAdministrateurFictif, seConnecter } from "./outils";

// Ce qui attend le propriétaire (Jalon 15, étape 2 ; ADR 0089). Compte FICTIF.
const ADMIN = "+999 000 032 01";

test("la liste unique : points vérifiés par la plateforme et points à confirmer", async ({
  page,
}) => {
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  await page.goto("/administration/tableau-de-bord");
  const encadre = page.getByRole("region", { name: "Ce qui vous attend" });
  await expect(encadre).toContainText(/\d+ points? à faire, \d+ à confirmer par vous/);
  await encadre.getByRole("link", { name: "Voir la liste complète →" }).click();

  await expect(page.getByRole("heading", { name: "Ce qui vous attend", level: 1 })).toBeVisible();
  for (const urgence of [
    "1. Maintenant : ce qui prend le plus de temps",
    "2. Avant de déployer le site",
    "3. Avant de démarrer le pilote",
    "Facultatif",
  ])
    await expect(page.getByRole("heading", { name: urgence, level: 2 })).toBeVisible();
  await expect(page.locator("#attente-juriste")).toContainText("Qui : Vous, avec un juriste local");
  // Les skills du dépôt portent encore « À valider par le propriétaire » : à faire, vérifié par la plateforme.
  await expect(page.locator("#attente-skills")).toContainText(
    "À faire — vérifié par la plateforme",
  );
  await expect(page.locator("#attente-github")).toContainText("À confirmer par vous");
  await expect(page.locator("#attente-juriste")).toContainText("condition 1");
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  expect.soft(resultat.violations.map((v) => `${v.id} : ${v.help}`)).toEqual([]);
});
