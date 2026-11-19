import { expect, test } from "@playwright/test";
import { creerInvitationFictive, executerSql, inscrireEleveActif, seConnecter } from "./outils";

// Français 3e (Jalon 7, étape 4 ; ADR 0057), agents SIMULÉS : la mécanique d'une matière littéraire (validation,
// quiz avec réponse courte corrigée, Coordinateur de la famille), pas la qualité réelle des contenus.
test.describe.configure({ mode: "serial" });

const REFERENT = "+999 000 013 01";
const ELEVE = "+999 000 013 02";
const TITRE = "L'argumentation : le dialogue argumentatif";

async function idChapitre(code: string): Promise<string> {
  const [c] = await executerSql(
    `select c.id from chapitres c join unites u on u.id = c.unite_id
     where u.code = 'ga-3e-francais' and c.code = $1`,
    [code],
  );
  return c.id;
}

test("le référent de Français valide un chapitre et son quiz ; le Coordinateur Français relit la famille", async ({
  page,
}) => {
  await creerInvitationFictive("TEST-FRAN-0001", ["francais"]);
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif français");
  await page.getByLabel("Code d'invitation").fill("TEST-FRAN-0001");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  // Seuls les chapitres de sa famille lui sont proposés.
  await expect(page.getByRole("link", { name: new RegExp(TITRE) })).toBeVisible();
  await expect(page.getByRole("link", { name: /Théorème de Thalès/ })).toHaveCount(0);

  await page.goto(`/referent/chapitres/${await idChapitre("dialogue-argumentatif")}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITRE);
  await page.getByLabel(/Commentaire/).fill("Relu (fictif).");
  await page.getByRole("button", { name: /Valider la version 1/ }).click();
  await expect(page).toHaveURL(/\/referent$/);

  await page.goto(`/referent/chapitres/${await idChapitre("dialogue-argumentatif")}`);
  await page.getByLabel("Nombre de questions").fill("3");
  await page.getByRole("button", { name: "Générer un quiz brouillon" }).click();
  await expect(page.getByRole("status")).toContainText("Quiz version 1 créé");
  await page.goto("/referent");
  await page.getByRole("link", { name: `Quiz : ${TITRE}` }).click();
  await page.getByLabel(/J'ai vérifié les points/).check();
  await page.getByRole("button", { name: "Valider la version 1" }).click();
  await expect(page.getByText("Statut : Validé")).toBeVisible();

  await page.goto("/referent");
  await page.getByRole("button", { name: /Lancer une revue de cohérence \(Français\)/ }).click();
  await expect(page).toHaveURL(/\/referent\/coordinateur\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /Revue de cohérence — Français/ })).toBeVisible();
  await expect(page.getByText("Statut :")).toContainText("brouillon");
  const [rapport] = await executerSql(
    "select count(*)::int as n from rapports_coordinateur where famille = 'francais'",
  );
  expect(rapport.n).toBeGreaterThan(0);
});

test("un élève de 3e trouve le Français et passe le quiz, réponse courte corrigée", async ({
  page,
}) => {
  await inscrireEleveActif(page, ELEVE, "3e");
  await page.goto("/catalogue");
  await page.getByRole("link", { name: /Français/ }).click();
  await expect(page).toHaveURL(/\/catalogue\/ga-3e-francais$/);
  await page.getByRole("link", { name: TITRE }).click();
  await page.getByRole("link", { name: "Faire le quiz du chapitre" }).click();
  await page.getByLabel("4", { exact: true }).check();
  await page.getByLabel("Faux").check();
  await page.getByLabel("Ta réponse à la question 3").fill("Une réponse courte fictive.");
  await page.getByRole("button", { name: "Envoyer mes réponses" }).click();
  await expect(page.getByText(/Ton score : \d+ \/ 100 \(enregistré\)/)).toBeVisible();
  // La correction donne une explication pour chaque question.
  await expect(page.getByText(/Explication :/).first()).toBeVisible();
});
