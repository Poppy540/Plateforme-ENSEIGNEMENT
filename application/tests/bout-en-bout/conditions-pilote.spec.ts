import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { creerAdministrateurFictif, seConnecter } from "./outils";

// Tableau des 12 conditions du pilote (Jalon 12, étape 4 ; ADR 0078). Compte et preuves FICTIFS.
test.describe.configure({ mode: "serial" });

const ADMIN = "+999 000 021 01";

async function auditer(page: Page, nom: string) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const violations = resultat.violations.map((v) => `${nom} — ${v.id} : ${v.help}`);
  expect.soft(violations, violations.join("\n")).toEqual([]);
}

const condition = (page: Page, numero: number) => page.locator(`#condition-${numero}`);

test("le propriétaire voit les 12 conditions ; 3 et 4 sont vérifiées par la plateforme", async ({
  page,
}) => {
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await page.getByRole("link", { name: "Conditions du pilote" }).click();
  await expect(page.getByRole("heading", { name: "Conditions du pilote", level: 1 })).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Conditions du pilote" }).getByRole("listitem"),
  ).toHaveCount(12);
  await expect(page.getByText(/\d+ \/ 12 conditions remplies/)).toBeVisible();
  await expect(condition(page, 3)).toContainText("vérifiée par la plateforme");
  await expect(condition(page, 3).getByText("Cocher avec une preuve")).toHaveCount(0);
  // En développement, la configuration n'est pas celle de production : noms des variables seulement.
  await expect(condition(page, 5)).toContainText("À régler sur le serveur");
  await expect(condition(page, 5)).toContainText("ANTHROPIC_API_KEY");
  await auditer(page, "conditions du pilote");
});

test("une condition se coche avec une preuve datée, sans coordonnées, puis se retire", async ({
  page,
}) => {
  await seConnecter(page, ADMIN);
  await page.goto("/administration/conditions");
  const premiere = condition(page, 1);
  await premiere.getByText("Cocher avec une preuve").click();
  await premiere
    .getByLabel(/Preuve/)
    .fill("Avis fictif du juriste, reçu par téléphone au +999 77 12 34 56");
  await premiere.getByLabel("Date de la preuve").fill("2099-01-01");
  await premiere.getByRole("button", { name: "Cocher la condition 1" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("dans le futur");

  await condition(page, 1).getByText("Cocher avec une preuve").click();
  await condition(page, 1)
    .getByLabel(/Preuve/)
    .fill("Avis fictif du juriste, reçu au +999 77 12 34 56");
  await condition(page, 1).getByLabel("Date de la preuve").fill("2026-10-20");
  await condition(page, 1).getByRole("button", { name: "Cocher la condition 1" }).click();
  await expect(page.getByRole("status")).toContainText("Condition 1 cochée");
  await expect(condition(page, 1)).toContainText("Remplie");
  await expect(condition(page, 1)).toContainText("[numéro masqué]");
  await expect(condition(page, 1)).not.toContainText("+999");
  await expect(condition(page, 1)).toContainText("20 octobre 2026");

  // Une condition mixte cochée reste « à revoir » tant que sa vérification échoue.
  await condition(page, 6).getByText("Cocher avec une preuve").click();
  await condition(page, 6)
    .getByLabel(/Preuve/)
    .fill("Restauration fictive essayée");
  await condition(page, 6).getByLabel("Date de la preuve").fill("2026-10-21");
  await condition(page, 6).getByRole("button", { name: "Cocher la condition 6" }).click();
  await expect(condition(page, 6)).toContainText("À revoir");
  await auditer(page, "conditions cochées");

  for (const numero of [1, 6]) {
    await condition(page, numero).getByText("Mettre à jour ou retirer la coche").click();
    await condition(page, numero).getByLabel("Motif du retrait").fill("Essai fictif terminé");
    await condition(page, numero)
      .getByRole("button", { name: `Retirer la coche de la condition ${numero}` })
      .click();
    await expect(page.getByRole("status")).toContainText(`condition ${numero} retirée`);
    await expect(condition(page, numero)).toContainText("À faire");
  }
});
