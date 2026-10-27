import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { creerAdministrateurFictif, seConnecter } from "./outils";

// Invitations de référents depuis l'administration (Jalon 10, étape 1 ; ADR 0066). Comptes fictifs.
test.describe.configure({ mode: "serial" });

const ADMIN = "+999 000 017 01";
const REFERENT = "+999 000 017 02";
const AUTRE = "+999 000 017 03";

async function auditer(page: Page, nom: string) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const violations = resultat.violations.map((v) => `${nom} — ${v.id} : ${v.help}`);
  expect.soft(violations, violations.join("\n")).toEqual([]);
}

async function creerInvitation(page: Page, famille: RegExp): Promise<string> {
  const section = page.getByRole("region", { name: "Référentiel ga-general" });
  await section.getByRole("checkbox", { name: famille }).check();
  await section.getByRole("button", { name: "Créer l'invitation" }).click();
  const code = section.locator(".code");
  await expect(code).toHaveText(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  return (await code.textContent())!;
}

async function activer(page: Page, numero: string, code: string) {
  await page.context().clearCookies();
  await seConnecter(page, numero);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif invité");
  await page.getByLabel("Code d'invitation").fill(code);
  await page.getByRole("button", { name: "Activer mon accès" }).click();
}

test("l'administration crée une invitation, le code s'affiche une fois et sert au référent", async ({
  page,
}) => {
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await page.getByRole("link", { name: "Inviter un référent" }).click();
  await expect(page.getByRole("heading", { name: "Inviter un enseignant-référent" })).toBeVisible();
  await auditer(page, "invitations, formulaire");

  // Formulaire sans famille cochée : refusé.
  const section = page.getByRole("region", { name: "Référentiel ga-general" });
  await section.getByRole("button", { name: "Créer l'invitation" }).click();
  await expect(section.locator(".erreur")).toContainText("au moins une famille");

  const code = await creerInvitation(page, /Mathématiques/);
  await expect(page.getByText("plus jamais affiché")).toBeVisible();
  await auditer(page, "invitations, code affiché");
  // Le code n'est plus affiché après un rechargement ; l'invitation est listée, en attente.
  await page.reload();
  await expect(page.locator("main")).not.toContainText(code);
  await expect(page.locator(".carte").first()).toContainText("en attente");

  await activer(page, REFERENT, code);
  await expect(page).toHaveURL(/\/referent$/);

  await page.context().clearCookies();
  await seConnecter(page, ADMIN);
  await page.goto("/administration/invitations");
  await expect(page.locator(".carte").first()).toContainText("utilisée par Référent fictif invité");
  // Libellé de la famille pris dans le pack du référentiel de l'invitation, pas dans un autre pack.
  await expect(page.locator(".carte").first()).toContainText("Mathématiques");
  await expect(page.locator(".carte").first()).not.toContainText("pays Z");
});

test("une invitation annulée ne permet plus de s'activer", async ({ page }) => {
  await seConnecter(page, ADMIN);
  await page.goto("/administration/invitations");
  const code = await creerInvitation(page, /Français/);
  await page.reload();
  const carte = page.locator(".carte").filter({ hasText: "en attente" }).first();
  await carte.getByRole("button", { name: "Annuler cette invitation" }).click();
  await expect(page.locator(".carte").first()).toContainText("annulée");

  await activer(page, AUTRE, code);
  await expect(page.locator(".erreur")).toContainText("invalide, expiré ou déjà utilisé");
});

test("un compte qui n'est pas l'administration n'atteint pas la page", async ({ page }) => {
  await seConnecter(page, REFERENT);
  await page.goto("/administration/invitations");
  await expect(page).not.toHaveURL(/\/administration\/invitations$/);
});
