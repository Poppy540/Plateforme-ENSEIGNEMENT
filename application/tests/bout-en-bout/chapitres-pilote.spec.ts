import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { creerAdministrateurFictif, creerInvitationFictive, seConnecter } from "./outils";

// Accueil du premier référent et chapitres du pilote (Jalon 11, étape 1 ; ADR 0070). Comptes fictifs ; unité
// Mathématiques 3e du pack pilote (deux chapitres désignés pour le pilote).
test.describe.configure({ mode: "serial" });

const ADMIN = "+999 000 020 01";
const REFERENT = "+999 000 020 02";

async function auditer(page: Page, nom: string) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const violations = resultat.violations.map((v) => `${nom} — ${v.id} : ${v.help}`);
  expect.soft(violations, violations.join("\n")).toEqual([]);
}

test("l'administration choisit les chapitres du pilote d'une unité", async ({ page }) => {
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await page.getByRole("link", { name: "Chapitres du pilote" }).click();
  await page.getByLabel("Unité").selectOption({ label: "3e — Mathématiques" });
  await page.getByRole("button", { name: "Afficher ses chapitres" }).click();
  await page.getByRole("checkbox", { name: "Théorème de Thalès" }).check();
  await page.getByRole("checkbox", { name: "Trigonométrie dans le triangle rectangle" }).check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("status")).toContainText("enregistrés");
  await expect(page.getByLabel("Unité").locator("option:checked")).toContainText("(2 au pilote)");
  await auditer(page, "chapitres du pilote");
});

test("le référent voit l'accueil, puis les chapitres du pilote avec la prochaine action", async ({
  page,
}) => {
  await creerInvitationFictive("TEST-PILO-0001", ["mathematiques"]);
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif du pilote");
  await page.getByLabel("Code d'invitation").fill("TEST-PILO-0001");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);

  // Première visite : encadré de bienvenue, lien vers l'accueil.
  await expect(page.getByRole("heading", { name: "Bienvenue" })).toBeVisible();
  const pilote = page.getByRole("list", { name: "Chapitres du pilote" });
  const thales = pilote.getByRole("listitem").filter({ hasText: "Théorème de Thalès" });
  await expect(thales).toContainText("Prochaine action");
  await expect(thales).toContainText(/étapes? sur 4 faites/);
  await auditer(page, "espace référent, première visite");

  await page.getByRole("link", { name: /Lire l'accueil/ }).click();
  await expect(
    page.getByRole("heading", { name: "Bienvenue dans l'espace référent" }),
  ).toBeVisible();
  await auditer(page, "accueil du référent");
  await page.getByRole("button", { name: "Commencer" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await expect(page.getByRole("heading", { name: "Bienvenue" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Revoir l'accueil/ })).toBeVisible();

  // La prochaine action mène à la bonne page.
  await thales.getByRole("link", { name: /Prochaine action/ }).click();
  await expect(page).toHaveURL(/\/referent\/(chapitres\/[0-9a-f-]{36}|prerequis|scripts\/|quiz\/)/);
});
