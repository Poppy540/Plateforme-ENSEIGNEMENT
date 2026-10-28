import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { creerAdministrateurFictif, executerSql, seConnecter } from "./outils";

// Rapport de fin de pilote (Jalon 14, étape 1 ; ADR 0084). Compte FICTIF ; période retirée à la fin.
test.describe.configure({ mode: "serial" });

const ADMIN = "+999 000 027 01";
const jourIso = (decalage: number) =>
  new Date(Date.now() + decalage * 86_400_000).toISOString().slice(0, 10);

async function auditer(page: Page, nom: string) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const violations = resultat.violations.map((v) => `${nom} — ${v.id} : ${v.help}`);
  expect.soft(violations, violations.join("\n")).toEqual([]);
}

test.afterAll(async () => {
  await executerSql("delete from periode_pilote");
});

test("saisir la période, puis lire le rapport de fin, semaine par semaine", async ({ page }) => {
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await page.getByRole("link", { name: "Rapport de fin de pilote" }).click();
  await expect(page.getByText("Saisissez d'abord la période du pilote.")).toBeVisible();

  // Fin avant le début : refusée.
  await page.getByLabel("Premier jour du pilote").fill(jourIso(-10));
  await page.getByLabel(/Dernier jour/).fill(jourIso(-20));
  await page.getByRole("button", { name: "Enregistrer la période" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("La fin doit suivre le début");

  await page.getByLabel("Premier jour du pilote").fill(jourIso(-20));
  await page.getByLabel(/Dernier jour/).fill("");
  await page.getByRole("button", { name: "Enregistrer la période" }).click();
  await expect(page.getByRole("status")).toContainText("Période du pilote enregistrée");
  await expect(page.getByText("(pilote en cours)")).toBeVisible();
  const tableau = page.getByRole("region", { name: /1\. Les élèves/ }).getByRole("table");
  await expect(tableau.getByRole("columnheader")).toHaveText([
    "Indicateur",
    "Total",
    "Sem. 1",
    "Sem. 2",
    "Sem. 3",
  ]);
  for (const titre of [
    "5. Le coût est-il soutenable ?",
    "Questionnaire anonyme",
    "Critères de suspension signalés pendant le pilote",
    "Décisions (journal du pilote)",
  ])
    await expect(page.getByRole("heading", { name: titre })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("+999");
  await auditer(page, "rapport de fin, équipe");

  const [telechargement] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Télécharger en texte (Markdown)" }).click(),
  ]);
  expect(telechargement.suggestedFilename()).toMatch(/^rapport-fin-pilote-.*-equipe\.md$/);
  const contenu = Buffer.concat(await (await telechargement.createReadStream()).toArray()).toString(
    "utf8",
  );
  expect(contenu).toContain("# Rapport de fin de pilote, du ");
  expect(contenu).toContain("| | Total | Sem. 1 | Sem. 2 | Sem. 3 |");
  expect(contenu).not.toMatch(/\+999|[0-9a-f]{8}-[0-9a-f]{4}-/);
});

test("version établissement : ni coûts, ni détail des agents, ni critères, ni journal", async ({
  page,
}) => {
  await seConnecter(page, ADMIN);
  await page.goto("/administration/fin-pilote");
  await page.getByLabel("Version").selectOption("etablissement");
  await page.getByRole("button", { name: "Afficher" }).click();
  await expect(page.getByText("version pour l'établissement")).toBeVisible();
  await expect(page.getByRole("heading", { name: "3. Signalements" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(
    /USD|Coût des agents|détresses|Tickets|Critères de suspension|journal du pilote/,
  );
  await auditer(page, "rapport de fin, établissement");
  const refus = await page.context().browser()!.newPage();
  expect((await refus.request.get("/api/administration/fin-pilote")).status()).toBe(403);
  await refus.close();
});
