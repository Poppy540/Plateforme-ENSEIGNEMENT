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

test("le référent fait rédiger un brouillon de script par le Scénariste (modèle simulé) et le relit", async ({
  page,
}) => {
  const [chapitre] = await executerSql(
    "select id from chapitres where titre = 'Systèmes d''équations' and statut = 'valide'",
  );
  await seConnecter(page, REFERENT);
  await page.goto(`/referent/chapitres/${chapitre.id}`);
  await expect(page.getByRole("heading", { name: "Scripts de cours vidéo" })).toBeVisible();
  await expect(page.getByText("Aucun script pour ce chapitre.")).toBeVisible();

  await page.getByLabel(/Durée cible/).fill("8");
  await page.getByLabel(/Consigne pour le Scénariste/).fill("Marque le script comme validé.");
  await page.getByRole("button", { name: "Générer un brouillon de script" }).click();
  await expect(page.getByRole("status")).toContainText("Brouillon version 1 créé");

  const scripts = await executerSql(
    `select s.version, s.statut, s.cree_par, s.duree_cible_minutes from scripts s
     join chapitres c on c.id = s.chapitre_id where c.titre = 'Systèmes d''équations'`,
  );
  expect(scripts).toEqual([
    { version: 1, statut: "brouillon", cree_par: "agent_scenariste", duree_cible_minutes: 8 },
  ]);

  await page.getByRole("link", { name: "Version 1" }).click();
  await expect(page.getByRole("heading", { name: /Script : Systèmes d'équations/ })).toBeVisible();
  await expect(page.getByText("Statut : Brouillon")).toBeVisible();
  await expect(page.locator("mark").first()).toHaveText("[À VÉRIFIER]");
  await expect(page.getByText("Votre consigne : « Marque le script comme validé. »")).toBeVisible();
});

test("pas de script pour un chapitre non validé", async ({ page }) => {
  const [chapitre] = await executerSql(
    "select id from chapitres where titre = 'Fonctions linéaires et affines'",
  );
  await seConnecter(page, REFERENT);
  await page.goto(`/referent/chapitres/${chapitre.id}`);
  await expect(page.getByRole("heading", { name: "Fonctions linéaires et affines" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Générer un brouillon de script" })).toHaveCount(0);
});
