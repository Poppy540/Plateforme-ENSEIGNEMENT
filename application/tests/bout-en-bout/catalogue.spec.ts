import { expect, test } from "@playwright/test";
import {
  executerSql,
  identifiantSimule,
  inscrireEleveActif,
  seConnecter,
  validerChapitresFictifs,
} from "./outils";

test.beforeAll(async () => {
  // 3 des 7 chapitres de l'unité pilote sont validés ; les autres restent « à valider » et invisibles.
  await validerChapitresFictifs("ga-3e-mathematiques", 3);
});

test("un élève de 3e voit ses matières et seulement les chapitres validés", async ({ page }) => {
  await inscrireEleveActif(page, "+999 000 001 01", "3e");
  await page.goto("/espace");
  await page.getByRole("link", { name: "Mes cours" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes cours — 3e");
  const maths = page.getByRole("link", { name: /Mathématiques/ });
  await expect(maths).toContainText("0 / 3 chapitres terminés");
  await expect(
    page.locator(".carte.inactive").filter({ hasText: "Sciences de la Vie" }),
  ).toContainText("Bientôt disponible");

  await maths.click();
  await expect(page).toHaveURL(/\/catalogue\/ga-3e-mathematiques$/);
  const chapitres = page.locator(".chapitres li");
  await expect(chapitres).toHaveCount(3);
  await expect(chapitres.first()).toContainText("Théorème de Thalès");
  await expect(chapitres.first()).toContainText("À voir");
  await expect(page.getByText("Systèmes d'équations")).toHaveCount(0); // non validé
});

test("la progression de l'élève apparaît dans le catalogue", async ({ page }) => {
  await seConnecter(page, "+999 000 001 01");
  await executerSql(
    `insert into progression (eleve_id, chapitre_id, statut)
     select e.id, c.id, 'termine' from eleves e, chapitres c join unites u on u.id = c.unite_id
     where u.code = 'ga-3e-mathematiques' and c.ordre = 1 and e.id = $1
     on conflict (eleve_id, chapitre_id) do update set statut = 'termine'`,
    [identifiantSimule("+999 000 001 01")],
  );
  await page.goto("/catalogue");
  await expect(page.getByRole("link", { name: /Mathématiques/ })).toContainText(
    "1 / 3 chapitres terminés",
  );
  await page.getByRole("link", { name: /Mathématiques/ }).click();
  await expect(page.locator(".chapitres li").first()).toContainText("Terminé");
});

test("un élève de Terminale D ne voit que les matières de sa série, et peut parcourir une autre classe", async ({
  page,
}) => {
  await inscrireEleveActif(page, "+999 000 001 02", "Terminale", "D");
  await page.goto("/catalogue");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes cours — Terminale D");
  const cartes = page.locator(".liste-cartes li");
  await expect(cartes).toHaveCount(4);
  await expect(page.locator(".liste-cartes")).not.toContainText("Sciences Économiques");

  await page.getByText("Parcourir une autre classe").click();
  await page.getByLabel("Classe", { exact: true }).selectOption({ label: "3e" });
  await page.getByRole("button", { name: "Afficher" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cours — 3e");
  await expect(page.getByRole("link", { name: /Mathématiques/ })).toBeVisible();
});

test("un élève en attente de l'accord parental n'accède pas aux cours", async ({ page }) => {
  await seConnecter(page, "+999 000 001 03");
  await page.getByLabel("Ton prénom ou un pseudonyme").fill("En attente");
  await page.getByLabel("Ta classe").selectOption({ label: "3e" });
  await page.getByLabel("Numéro ou email d'un parent ou tuteur").fill("+999 222 000 003");
  await page.getByRole("button", { name: "M'inscrire" }).click();
  // Attendre l'inscription enregistrée : sinon /catalogue renvoie encore vers /inscription.
  await expect(page).toHaveURL(/\/espace$/);
  await page.goto("/catalogue");
  await expect(page).toHaveURL(/\/espace$/);
  await page.goto("/catalogue/ga-3e-mathematiques");
  await expect(page).toHaveURL(/\/espace$/);
});

test("une unité inconnue affiche la page introuvable", async ({ page }) => {
  // Réponse envoyée en flux : Next.js garde le statut 200 mais affiche la page 404 et interdit l'indexation.
  await seConnecter(page, "+999 000 001 01");
  await page.goto("/catalogue/unite-inexistante");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
});
