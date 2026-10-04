import { expect, test } from "@playwright/test";
import { creerInvitationFictive, executerSql, seConnecter } from "./outils";

const REFERENT = "+999 000 002 01";

test.beforeAll(async () => {
  await creerInvitationFictive("TEST-REFE-0001", ["mathematiques"]);
});

test("un enseignant active son accès référent avec son code d'invitation", async ({ page }) => {
  await seConnecter(page, REFERENT);
  await expect(page).toHaveURL(/\/inscription$/);
  await page.getByRole("link", { name: "Activer votre accès avec votre code" }).click();

  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Prof fictif");
  await page.getByLabel("Code d'invitation").fill("FAUX-CODE-0000");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page.locator(".erreur")).toContainText("invalide");

  await page.getByLabel("Code d'invitation").fill("test-refe-0001");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await expect(page.getByRole("heading", { name: "Espace enseignant-référent" })).toBeVisible();
  await expect(page.getByText("mathematiques")).toBeVisible();
});

test("le référent rejette sans commentaire : refusé ; puis valide un chapitre, visible ensuite par les élèves", async ({
  page,
}) => {
  await seConnecter(page, REFERENT);
  await expect(page).toHaveURL(/\/referent$/);
  await page.getByRole("link", { name: /Systèmes d'équations/ }).click();
  await expect(page.getByRole("heading", { name: "Systèmes d'équations" })).toBeVisible();

  await page.getByRole("button", { name: "Rejeter" }).click();
  await expect(page.locator(".erreur")).toContainText("Expliquez");

  await page.getByLabel(/Commentaire/).fill("Relu, conforme.");
  await page.getByRole("button", { name: /Valider la version/ }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await expect(page.getByRole("link", { name: /Systèmes d'équations/ })).toHaveCount(0);
  await expect(page.getByText(/Validé : Systèmes d'équations/)).toBeVisible();

  const traces = await executerSql(
    `select a.version, a.empreinte = c.empreinte as meme_empreinte, p.prenom_ou_pseudo
     from approbations a join chapitres c on c.id = a.objet_id join profils p on p.id = a.valideur_id
     where c.titre = 'Systèmes d''équations'`,
  );
  expect(traces).toEqual([{ version: 1, meme_empreinte: true, prenom_ou_pseudo: "Prof fictif" }]);

  // L'élève de 3e (inscrit dans les tests du catalogue) voit maintenant ce chapitre.
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await seConnecter(page, "+999 000 001 01");
  await page.goto("/catalogue/ga-3e-mathematiques");
  await expect(page.getByText("Systèmes d'équations")).toBeVisible();
});

test("un chapitre modifié pendant la relecture ne peut pas être validé sans nouvelle lecture", async ({
  page,
}) => {
  await seConnecter(page, REFERENT);
  await page.getByRole("link", { name: /Fonctions linéaires et affines/ }).click();
  await expect(page.getByText("version 1").first()).toBeVisible();

  await executerSql(
    `update chapitres set sous_themes = array['Modifié pendant la relecture']
     where titre = 'Fonctions linéaires et affines'`,
  );
  await page.getByRole("button", { name: /Valider la version 1/ }).click();
  await expect(page.locator(".erreur")).toContainText("a été modifié");

  await page.reload();
  await expect(page.getByRole("button", { name: /Valider la version 2/ })).toBeVisible();
});

test("un élève n'accède pas à l'espace référent", async ({ page }) => {
  await seConnecter(page, "+999 000 001 01");
  await page.goto("/referent");
  await expect(page).toHaveURL(/\/espace$/);
  await page.goto("/referent/activer");
  await expect(page).toHaveURL(/\/espace$/);
});
