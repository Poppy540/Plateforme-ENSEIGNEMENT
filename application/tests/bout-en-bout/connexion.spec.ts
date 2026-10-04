import { expect, test } from "@playwright/test";
import { seConnecter } from "./outils";

// Numéros fictifs (indicatif +999 inexistant) ; authentification simulée, code 123456.
test("un numéro invalide est refusé", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Ton numéro de téléphone").fill("0612");
  await page.getByRole("button", { name: "Recevoir un code" }).click();
  await expect(page.locator(".erreur")).toContainText("format international");
});

test("un mauvais code est refusé", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Ton numéro de téléphone").fill("+999 000 000 01");
  await page.getByRole("button", { name: "Recevoir un code" }).click();
  await page.getByLabel("Code reçu").fill("000000");
  await page.getByRole("button", { name: "Valider" }).click();
  await expect(page.locator(".erreur")).toContainText("Code incorrect");
});

test("l'espace élève est réservé aux comptes connectés", async ({ page }) => {
  await page.goto("/espace");
  await expect(page).toHaveURL(/\/connexion$/);
});

test("inscription d'un élève mineur, en attente puis activée par le parent", async ({ page }) => {
  await seConnecter(page, "+999 000 000 02");
  await expect(page).toHaveURL(/\/inscription$/);

  await page.getByLabel("Ton prénom ou un pseudonyme").fill("Élève fictif");
  await page.getByLabel("Ta classe").selectOption({ label: "3e" });
  // Âge de la majorité inconnu dans le pack : pas de case « majeur », le parent est toujours requis.
  await expect(page.getByText(/ans ou plus/)).toHaveCount(0);
  await page.getByLabel("Numéro ou email d'un parent ou tuteur").fill("+999 000 000 99");
  await page.getByRole("button", { name: "M'inscrire" }).click();

  await expect(page).toHaveURL(/\/espace$/);
  await expect(page.getByRole("heading", { name: "Bonjour Élève fictif" })).toBeVisible();
  await expect(page.getByText("attend l'accord de ton parent")).toBeVisible();

  // Le parent reçoit le lien (boîte de réception simulée) et accepte.
  await page.goto("/developpement/messages");
  const texte = await page.locator(".messages li").first().innerText();
  expect(texte).toContain("+99900000099");
  const lien = texte.match(/https?:\/\/\S+\/parent\/confirmer\?jeton=[0-9a-f]+/)?.[0];
  expect(lien).toBeTruthy();

  const pageParent = await page.context().browser()!.newPage();
  await pageParent.goto(lien!);
  await pageParent.getByRole("button", { name: "J'accepte l'inscription" }).click();
  await expect(pageParent.getByRole("status")).toContainText("inscription est acceptée");

  // Le même lien ne sert qu'une fois.
  await pageParent.goto(lien!);
  await pageParent.getByRole("button", { name: "J'accepte l'inscription" }).click();
  await expect(pageParent.getByRole("status")).toContainText("déjà été utilisé");
  await pageParent.close();

  await page.goto("/espace");
  await expect(page.getByText("Ton compte est actif.")).toBeVisible();
});

test("une classe à séries exige la série", async ({ page }) => {
  await seConnecter(page, "+999 000 000 03");
  await page.getByLabel("Ton prénom ou un pseudonyme").fill("Lycéen fictif");
  await page.getByLabel("Ta classe").selectOption({ label: "Terminale" });
  await expect(page.getByLabel("Ta série")).toBeVisible();
  await page.getByLabel("Ta série").selectOption({ index: 4 });
  await page.getByLabel("Numéro ou email d'un parent ou tuteur").fill("parent.fictif@exemple.org");
  await page.getByRole("button", { name: "M'inscrire" }).click();
  await expect(page.locator("main")).toContainText("— série");
  await expect(page).toHaveURL(/\/espace$/);
});

test("déconnexion", async ({ page }) => {
  await seConnecter(page, "+999 000 000 02");
  await expect(page).toHaveURL(/\/espace$/);
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/espace");
  await expect(page).toHaveURL(/\/connexion$/);
});
