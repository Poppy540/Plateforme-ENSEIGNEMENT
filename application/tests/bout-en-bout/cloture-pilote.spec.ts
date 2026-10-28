import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { creerAdministrateurFictif, executerSql, seConnecter } from "./outils";

// Clôture du pilote (Jalon 14, étape 2 ; ADR 0085). Compte, période et preuves FICTIFS ; retirés à la fin.
test.describe.configure({ mode: "serial" });

const ADMIN = "+999 000 028 01";
const geste = (page: Page, code: string) => page.locator(`#geste-${code}`);

async function auditer(page: Page, nom: string) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const violations = resultat.violations.map((v) => `${nom} — ${v.id} : ${v.help}`);
  expect.soft(violations, violations.join("\n")).toEqual([]);
}

test.afterAll(async () => {
  await executerSql("delete from journal_pilote where type = 'decision_finale'");
  await executerSql("delete from gestes_cloture");
  await executerSql("delete from periode_pilote");
});

test("pilote terminé : rapport téléchargé, décision d'arrêt, gestes cochés ; mise en veille à faire", async ({
  page,
}) => {
  await creerAdministrateurFictif(ADMIN);
  await executerSql(
    `insert into periode_pilote (debut, fin, maj_par) values (current_date - 28, current_date - 1, 'test')
     on conflict (id) do update set debut = excluded.debut, fin = excluded.fin`,
  );
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await page.getByRole("link", { name: "Clôture du pilote" }).click();
  await expect(page.getByText("1 / 8 gestes faits")).toBeVisible();
  await expect(geste(page, "periode_terminee")).toContainText("Fait");
  await expect(geste(page, "rapport_fin")).toContainText("Pas encore téléchargé");
  await auditer(page, "clôture, au départ");

  // Le téléchargement du rapport de fin est noté.
  expect(
    (await page.request.get("/api/administration/fin-pilote?version=etablissement")).status(),
  ).toBe(200);

  await geste(page, "decision_finale").getByText("Noter la décision finale").click();
  await page.getByLabel("Décision").selectOption("arreter");
  await page.getByLabel(/^Motif/).fill("Fin prévue du pilote atteinte (fictif)");
  await page.getByRole("button", { name: "Noter la décision" }).click();
  await expect(page.getByRole("status")).toContainText("Décision finale notée");
  await expect(geste(page, "rapport_fin")).toContainText("Fait");
  await expect(geste(page, "decision_finale")).toContainText("Arrêter le pilote : Fin prévue");
  await expect(geste(page, "mise_en_veille")).toContainText("Accès des élèves encore ouvert");

  await geste(page, "reunion_bilan").getByText("Cocher avec une preuve").click();
  await geste(page, "reunion_bilan")
    .getByLabel(/Preuve/)
    .fill("Réunion fictive tenue ; compte rendu envoyé au +999 77 12 34 56");
  await geste(page, "reunion_bilan").getByLabel("Date de la preuve").fill("2026-10-27");
  await geste(page, "reunion_bilan").getByRole("button", { name: "Cocher ce geste" }).click();
  await expect(page.getByRole("status")).toContainText("Geste coché");
  await expect(geste(page, "reunion_bilan")).toContainText("[numéro masqué]");
  await expect(page.locator("main")).not.toContainText("+999");
  await expect(page.getByText("4 / 8 gestes faits")).toBeVisible();
  await auditer(page, "clôture, en cours");

  // La décision figure au journal du pilote.
  await page.goto("/administration/journal");
  await expect(
    page.getByRole("list", { name: "Entrées du journal du pilote" }).getByRole("listitem").first(),
  ).toContainText("Décision finale");
});
