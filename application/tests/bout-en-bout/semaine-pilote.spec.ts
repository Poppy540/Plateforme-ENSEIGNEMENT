import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { creerAdministrateurFictif, seConnecter } from "./outils";

// Rapport de la semaine du pilote (Jalon 13, étape 3 ; ADR 0082). Compte FICTIF ; chiffres de la base de test.
test.describe.configure({ mode: "serial" });

const ADMIN = "+999 000 025 01";

async function auditer(page: Page, nom: string) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const violations = resultat.violations.map((v) => `${nom} — ${v.id} : ${v.help}`);
  expect.soft(violations, violations.join("\n")).toEqual([]);
}

test("version équipe : les 5 questions, critères et décisions ; export en texte", async ({
  page,
}) => {
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await page.getByRole("link", { name: "Semaine du pilote" }).click();
  await expect(page.getByRole("heading", { name: "Semaine du pilote", level: 1 })).toBeVisible();
  await expect(page.getByText("version équipe")).toBeVisible();
  for (const titre of [
    "1. Les élèves utilisent-ils la plateforme ?",
    "2. Les contenus aident-ils à comprendre ?",
    "3. Les agents restent-ils dans leur rôle ?",
    "4. L'équipe tient-elle la charge ?",
    "5. Le coût est-il soutenable ?",
    "Critères de suspension (état actuel)",
    "Décisions de la semaine (journal du pilote)",
  ])
    await expect(page.getByRole("heading", { name: titre })).toBeVisible();
  await expect(
    page.getByRole("region", { name: /1\. Les élèves/ }).getByRole("table"),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText("+999");
  await auditer(page, "semaine du pilote, équipe");

  const [telechargement] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Télécharger en texte (Markdown)" }).click(),
  ]);
  expect(telechargement.suggestedFilename()).toMatch(
    /^semaine-pilote-\d{4}-\d{2}-\d{2}-equipe\.md$/,
  );
  const texte = await (await telechargement.createReadStream()).toArray();
  const contenu = Buffer.concat(texte).toString("utf8");
  expect(contenu).toContain("# Semaine du pilote, du ");
  expect(contenu).toContain("| Élèves actifs dans la semaine |");
  expect(contenu).toContain("## Critères de suspension");
  expect(contenu).not.toMatch(/\+999|[0-9a-f]{8}-[0-9a-f]{4}-/);
});

test("version établissement : ni coûts, ni détail des agents ; semaine choisie", async ({
  page,
}) => {
  await seConnecter(page, ADMIN);
  await page.goto("/administration/semaine");
  await page.getByLabel("Dernier jour de la semaine").fill("2026-10-21");
  await page.getByLabel("Version").selectOption("etablissement");
  await page.getByRole("button", { name: "Afficher" }).click();
  await expect(page).toHaveURL(/fin=2026-10-21&version=etablissement/);
  await expect(page.getByText("Du 15 octobre 2026 au 21 octobre 2026")).toBeVisible();
  await expect(page.getByText("version pour l'établissement")).toBeVisible();
  await expect(page.getByRole("heading", { name: "3. Signalements" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(
    /USD|Coût des agents|détresses|Tickets|Critères de suspension/,
  );
  await auditer(page, "semaine du pilote, établissement");
  // Une demande sans session est refusée.
  const refus = await page.context().browser()!.newPage();
  expect((await refus.request.get("/api/administration/semaine")).status()).toBe(403);
  await refus.close();
});
