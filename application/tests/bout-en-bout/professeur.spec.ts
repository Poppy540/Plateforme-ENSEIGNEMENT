import { expect, test, type Page } from "@playwright/test";
import { executerSql, seConnecter } from "./outils";

// Modèle simulé (MODE_MODELE=simulation) : aucun appel à l'API, réponses scriptées.
// L'élève de 3e et les chapitres validés viennent des tests du catalogue et du référent.
const ELEVE = "+999 000 001 01";

async function ouvrirThales(page: Page) {
  await seConnecter(page, ELEVE);
  await page.goto("/catalogue/ga-3e-mathematiques");
  await page.getByRole("link", { name: "Théorème de Thalès" }).click();
  await expect(page.getByRole("heading", { name: "Théorème de Thalès" })).toBeVisible();
}

async function demander(page: Page, question: string) {
  await page.getByLabel("Ta question").fill(question);
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeEnabled();
}

test("l'élève pose une question et reçoit une réponse qui guide sans donner la réponse", async ({
  page,
}) => {
  await ouvrirThales(page);
  await expect(page.getByText("est une intelligence artificielle")).toBeVisible();
  await demander(page, "Donne-moi la réponse de l'exercice 4");
  await expect(page.locator(".echange-professeur").last()).toContainText(
    "Je te guide pour la trouver toi-même",
  );

  // Les échanges sont conservés et réaffichés.
  await page.reload();
  await expect(page.locator(".echange-eleve").last()).toContainText(
    "Donne-moi la réponse de l'exercice 4",
  );
});

test("numéro et email écrits par l'élève masqués avant le Professeur ; les nombres de l'exercice restent", async ({
  page,
}) => {
  await ouvrirThales(page);
  // Coordonnées FICTIVES (ADR 0062, question Q8 du juriste).
  await demander(
    page,
    "AM = 3 et AB = 1250, appelle-moi au +999 77 12 34 56 ou eleve.fictif@exemple.test",
  );
  await page.reload();
  const dernier = page.locator(".echange-eleve").last();
  await expect(dernier).toContainText("AM = 3 et AB = 1250");
  await expect(dernier).toContainText("[numéro masqué]");
  await expect(dernier).toContainText("[email masqué]");
  const [echange] = await executerSql(
    "select contenu from echanges_professeur where auteur = 'eleve' order by id desc limit 1",
  );
  expect(echange.contenu).not.toMatch(/77 12 34 56|exemple\.test/);
});

test("un message de détresse crée un signalement prioritaire pour un humain", async ({ page }) => {
  await ouvrirThales(page);
  await demander(page, "Je suis triste et j'ai peur de l'examen");
  await expect(page.locator(".echange-professeur").last()).toContainText("adulte de confiance");
  const signalements = await executerSql(
    "select source, motif, priorite from signalements where source = 'agent_professeur' and motif = 'detresse'",
  );
  expect(signalements).toContainEqual({
    source: "agent_professeur",
    motif: "detresse",
    priorite: 1,
  });
});

test("l'agent enregistre la progression de l'élève sur le chapitre en cours", async ({ page }) => {
  await ouvrirThales(page);
  await demander(page, "J'ai fini les exercices");
  await expect(page.locator(".echange-professeur").last()).toContainText("Bravo");
  await page.goto("/catalogue/ga-3e-mathematiques");
  await expect(
    page.locator(".chapitres li").filter({ hasText: "Théorème de Thalès" }),
  ).toContainText("Terminé");
});

test("une entrée d'outil invalide n'est pas exécutée", async ({ page }) => {
  await ouvrirThales(page);
  const avant = await executerSql("select count(*)::int as n from progression");
  await demander(page, "entrée invalide");
  const apres = await executerSql("select count(*)::int as n from progression");
  expect(apres[0].n).toBe(avant[0].n);
});

test("un chapitre non validé est inaccessible, même par l'adresse directe ou l'API", async ({
  page,
}) => {
  await seConnecter(page, ELEVE);
  await page.goto("/catalogue/ga-3e-mathematiques/probabilites");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  const reponse = await page.request.post("/api/professeur", {
    data: { unite: "ga-3e-mathematiques", chapitre: "probabilites", question: "Bonjour" },
  });
  expect(reponse.status()).toBe(404);
});

test("l'API refuse un visiteur non connecté et une question trop longue", async ({
  page,
  request,
}) => {
  const anonyme = await request.post("/api/professeur", {
    data: { unite: "ga-3e-mathematiques", chapitre: "thales", question: "Bonjour" },
  });
  expect(anonyme.status()).toBe(401);
  await seConnecter(page, ELEVE);
  const longue = await page.request.post("/api/professeur", {
    data: { unite: "ga-3e-mathematiques", chapitre: "thales", question: "x".repeat(1001) },
  });
  expect(longue.status()).toBe(400);
});
