import { expect, test } from "@playwright/test";
import { creerAdministrateurFictif, seConnecter, validerChapitresFictifs } from "./outils";

// Essai de portabilité (Jalon 4, étape 5 ; ADR 0041) : le pays FICTIF « zz » est importé à côté du pilote
// (scripts/base-locale.sh, option --test). Aucune modification du code, aucun mélange entre pays.
test.describe.configure({ mode: "serial" });

const ELEVE_Z = "+999 000 001 96";
const ADMIN = "+999 000 001 95";

test.beforeAll(async () => {
  await validerChapitresFictifs("zz-an3-mathematiques", 2);
});

test("aide sans compte : chaque pays garde sa FAQ", async ({ page }) => {
  await page.goto("/aide");
  await page.getByRole("link", { name: "Pays fictif Z" }).click();
  await expect(page.getByText("Comment m'inscrire dans le pays Z ?")).toBeVisible();
  await expect(page.getByText("Comment m'inscrire ?", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Gabon" }).click();
  await expect(page.getByText("Comment m'inscrire ?", { exact: true })).toBeVisible();
  await expect(page.getByText("Comment m'inscrire dans le pays Z ?")).toHaveCount(0);
});

test("élève du pays Z : classes et majorité de son pack, catalogue et professeur de son pays", async ({
  page,
}) => {
  await seConnecter(page, ELEVE_Z);
  await expect(page).toHaveURL(/\/inscription$/);
  await page.getByLabel("Ton prénom ou un pseudonyme").fill("Élève fictif Z");
  await page.getByLabel("Pays et programme").selectOption({ value: "zz-general" });
  const classes = await page.getByLabel("Ta classe").locator("option").allTextContents();
  expect(classes).toEqual(["Choisir…", "Année 1", "Année 2", "Année 3", "Année 4"]);
  await page.getByLabel("Ta classe").selectOption({ label: "Année 3" });
  // Majorité fixée par le pack du pays Z (16 ans) : pas d'accord parental pour un élève majeur.
  await page.getByLabel("J'ai 16 ans ou plus").check();
  await page.getByRole("button", { name: "M'inscrire" }).click();
  await expect(page).toHaveURL(/\/espace$/);

  await page.getByRole("link", { name: "Mes cours" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes cours — Année 3");
  await expect(page.getByText(/Fran[cç]ais|Anglais|Thalès/)).toHaveCount(0);
  await page.getByRole("link", { name: /Mathématiques/ }).click();
  await expect(page).toHaveURL(/\/catalogue\/zz-an3-mathematiques$/);
  await expect(page.locator(".chapitres li")).toHaveCount(2);

  // Le Professeur de l'unité du pays Z (valeurs de son pack) répond.
  await page.getByRole("link", { name: "Équations du premier degré (pays Z)" }).click();
  await page.getByLabel("Ta question").fill("Je ne comprends pas l'étape 2");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.locator(".echange-professeur").last()).not.toBeEmpty();
  await expect(page.locator(".erreur")).toHaveCount(0);

  // Son aide est celle de son pays, sans choix de pays.
  await page.goto("/aide");
  await expect(page.getByText("Quelle option choisir en Année 4 ?")).toBeVisible();
  await expect(page.getByRole("link", { name: "Gabon" })).toHaveCount(0);
});

test("recrutement : sources autorisées du pack du pays choisi", async ({ page }) => {
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  await page.goto("/administration/recrutement?referentiel=zz-general");
  const sources = await page.getByLabel("Source autorisée").locator("option").allTextContents();
  expect(sources.some((s) => s.includes("pays Z"))).toBe(true);
  expect(sources.some((s) => s.includes("Recommandation"))).toBe(false);
  await page.goto("/administration/recrutement?referentiel=ga-general");
  const pilote = await page.getByLabel("Source autorisée").locator("option").allTextContents();
  expect(pilote.some((s) => s.includes("pays Z"))).toBe(false);
});
