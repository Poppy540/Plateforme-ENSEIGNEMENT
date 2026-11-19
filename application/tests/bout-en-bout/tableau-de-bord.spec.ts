import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { creerAdministrateurFictif, executerSql, seConnecter } from "./outils";

// Tableau de bord du pilote (Jalon 15, étape 1 ; ADR 0088). Compte FICTIF ; période posée puis retirée.
test.describe.configure({ mode: "serial" });

const ADMIN = "+999 000 031 01";

async function auditer(page: Page, nom: string) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const violations = resultat.violations.map((v) => `${nom} — ${v.id} : ${v.help}`);
  expect.soft(violations, violations.join("\n")).toEqual([]);
}

async function periode(debut: number, fin: number | null) {
  await executerSql(
    `insert into periode_pilote (debut, fin, maj_par)
     values (current_date + $1::int, case when $2::int is null then null else current_date + $2::int end, 'test')
     on conflict (id) do update set debut = excluded.debut, fin = excluded.fin`,
    [debut, fin],
  );
}

test.afterAll(async () => {
  await executerSql("delete from periode_pilote");
});

test("la phase et la prochaine action suivent la période du pilote", async ({ page }) => {
  await creerAdministrateurFictif(ADMIN);
  await executerSql("delete from periode_pilote");
  await seConnecter(page, ADMIN);
  await page.goto("/administration");

  // Préparation : encadré en tête de l'administration, prochaine action vers les conditions.
  await expect(page.getByRole("heading", { name: "Pilote : Préparation" })).toBeVisible();
  await page.getByRole("link", { name: "Voir le tableau de bord" }).click();
  await expect(
    page.getByRole("heading", { name: "Tableau de bord du pilote", level: 1 }),
  ).toBeVisible();
  const etapes = page.getByRole("list", { name: "Étapes du pilote" });
  await expect(etapes.locator("[aria-current=step]")).toContainText("Préparation (étape actuelle)");
  await expect(etapes).toContainText(/Conditions du pilote : \d+ \/ 12/);
  await expect(page.getByRole("region", { name: "Prochaine action" })).toContainText(
    "Remplir la condition",
  );
  await auditer(page, "tableau de bord, préparation");

  // En cours : critères et chiffres des 7 derniers jours.
  await periode(-3, null);
  await page.reload();
  await expect(etapes.locator("[aria-current=step]")).toContainText("Pilote en cours");
  await expect(etapes.locator("[aria-current=step]")).toContainText("Élèves actifs (7 jours)");
  await expect(page.getByRole("region", { name: "Prochaine action" })).toContainText(
    /point de la semaine|Critère atteint|à examiner/,
  );
  await auditer(page, "tableau de bord, en cours");

  // Terminé : le premier geste de clôture à faire.
  await periode(-30, -2);
  await page.reload();
  await expect(etapes.locator("[aria-current=step]")).toContainText("Pilote terminé");
  await expect(page.getByRole("region", { name: "Prochaine action" })).toContainText("Clôture :");
  await page.getByRole("region", { name: "Prochaine action" }).getByRole("link").click();
  await expect(page).toHaveURL(/\/administration\/(cloture|fin-pilote)/);
});
