import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { creerAdministrateurFictif, reprendre, seConnecter } from "./outils";

// Journal du pilote et reprise (Jalon 13, étape 2 ; ADR 0081). Compte et textes FICTIFS ; l'agent suspendu ici
// (Tuteur) est réactivé à la fin du même test.
test.describe.configure({ mode: "serial" });

const ADMIN = "+999 000 024 01";

async function auditer(page: Page, nom: string) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const violations = resultat.violations.map((v) => `${nom} — ${v.id} : ${v.help}`);
  expect.soft(violations, violations.join("\n")).toEqual([]);
}

test("suspendre un agent avec un motif, puis le réactiver avec les 4 points : tout est au journal", async ({
  page,
}) => {
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await page.locator("summary", { hasText: /^Suspendre tuteur$/ }).click();
  await page
    .getByLabel("Motif de la suspension")
    .last()
    .fill("Rapport sans accord, joignable au +999 77 12 34 56");
  await page.locator("#critere-tuteur").selectOption({
    label: "Sortie de périmètre d'un agent (hors programme, rapport sans accord)",
  });
  await page.getByRole("button", { name: "Suspendre tuteur", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("Agent tuteur suspendu");
  await expect(page.getByText("tuteur : suspendu")).toBeVisible();
  await auditer(page, "administration, agent suspendu");

  // Reprise incomplète : le navigateur exige les cases ; la base aussi (testé en base).
  await page.getByText("Réactiver tuteur (reprise)", { exact: true }).click();
  await page.getByRole("button", { name: "Réactiver tuteur", exact: true }).click();
  await expect(page.getByText("tuteur : suspendu")).toBeVisible();
  await page.reload();
  await reprendre(page, "Réactiver tuteur (reprise)", "Réactiver tuteur");
  await expect(page.getByRole("status").first()).toContainText("reprise notée au journal");
  await expect(page.getByText("tuteur : actif")).toBeVisible();

  await page.getByRole("link", { name: "Journal du pilote" }).click();
  const entrees = page
    .getByRole("list", { name: "Entrées du journal du pilote" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading") });
  await expect(entrees.first()).toContainText("Reprise d'un agent : tuteur");
  await expect(entrees.first()).toContainText("Cause identifiée : Cause fictive identifiée");
  await expect(entrees.first()).toContainText("Établissement : informé");
  await expect(entrees.nth(1)).toContainText("Suspension d'un agent : tuteur");
  await expect(entrees.nth(1)).toContainText("[numéro masqué]");
  await expect(entrees.nth(1)).toContainText("Critère : Sortie de périmètre");
  await expect(page.locator("main")).not.toContainText("+999");
  await auditer(page, "journal du pilote");
});

test("un point hebdomadaire s'ajoute au journal", async ({ page }) => {
  await seConnecter(page, ADMIN);
  await page.goto("/administration/journal");
  await page.getByText("Ajouter un point hebdomadaire ou une note").click();
  await page
    .getByLabel(/^Texte/)
    .fill("Point fictif de la semaine : rien à signaler, seuils à valider.");
  await page.getByRole("button", { name: "Ajouter au journal" }).click();
  await expect(page.getByRole("status")).toContainText("Entrée ajoutée");
  await expect(
    page.getByRole("list", { name: "Entrées du journal du pilote" }).getByRole("listitem").first(),
  ).toContainText("Point hebdomadaire");
});
