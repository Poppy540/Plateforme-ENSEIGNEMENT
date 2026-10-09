import { expect, test } from "@playwright/test";
import { creerAdministrateurFictif, executerSql, seConnecter } from "./outils";

// Suspension effective des agents et interrupteur d'accès des élèves (ADR 0034).
const ELEVE = "+999 000 001 01"; // élève de 3e inscrit par les tests du catalogue
const ADMIN = "+999 000 001 63";
const NOUVEL_ELEVE = "+999 000 001 64";

async function chapitreValide(): Promise<string> {
  const [c] = await executerSql(
    `select c.code from chapitres c join unites u on u.id = c.unite_id
     where u.code = 'ga-3e-mathematiques' and c.statut = 'valide' order by c.ordre limit 1`,
  );
  return c.code;
}

test.afterEach(async () => {
  // Les autres tests supposent tous les agents actifs et l'accès ouvert.
  await executerSql(
    "update etat_agents set suspendu = false, motif = null where agent in ('professeur', 'support', 'tuteur')",
  );
  await executerSql("update acces_eleves set ouvert = true, motif = null, maj_par = null");
});

test("un agent suspendu ne répond plus aux élèves ; il reprend une fois réactivé", async ({
  page,
  browser,
}) => {
  const chapitre = await chapitreValide();
  await executerSql(
    `update etat_agents set suspendu = true, motif = 'Comportement inattendu (test)'
     where agent in ('professeur', 'support', 'tuteur')`,
  );
  await seConnecter(page, ELEVE);
  const question = () =>
    page.request.post("/api/professeur", {
      data: { unite: "ga-3e-mathematiques", chapitre, question: "Bonjour" },
    });
  const refus = await question();
  expect(refus.status()).toBe(503);
  expect((await refus.json()).erreur).toContain("momentanément indisponible");

  await page.goto("/aide");
  await page.getByLabel("Ta question").fill("Comment je m'inscris ?");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.locator(".erreur")).toContainText("momentanément indisponible");

  await page.goto("/espace/plan");
  await page.getByRole("button", { name: "Mettre à jour mon plan" }).click();
  await expect(page.locator(".erreur")).toContainText("momentanément indisponible");

  await creerAdministrateurFictif(ADMIN);
  const admin = await browser.newPage();
  await seConnecter(admin, ADMIN);
  await admin.goto("/administration");
  await admin.getByRole("button", { name: "Réactiver professeur" }).click();
  await expect(admin.getByText("professeur : actif")).toBeVisible();
  await admin.close();
  const reprise = await question();
  expect(reprise.status()).toBe(200);
});

test("accès des élèves fermé par l'administration : message neutre, « Mes données » accessible, réouverture", async ({
  page,
  browser,
}) => {
  const chapitre = await chapitreValide();
  await creerAdministrateurFictif(ADMIN);
  const admin = await browser.newPage();
  await seConnecter(admin, ADMIN);
  await admin.goto("/administration");
  await admin.getByLabel(/Motif/).fill("Détresse non traitée dans le délai (test)");
  await admin.getByRole("button", { name: "Fermer l'accès des élèves" }).click();
  await expect(admin.getByRole("status").first()).toContainText("fermé");

  await seConnecter(page, ELEVE).catch(() => undefined);
  for (const adresse of ["/espace", "/catalogue", `/catalogue/ga-3e-mathematiques/${chapitre}`]) {
    await page.goto(adresse);
    await expect(page).toHaveURL(/\/indisponible$/);
  }
  await expect(page.getByRole("status")).toContainText("momentanément indisponible");
  await expect(page.getByText("Détresse non traitée")).toHaveCount(0);
  const refus = await page.request.post("/api/professeur", {
    data: { unite: "ga-3e-mathematiques", chapitre, question: "Bonjour" },
  });
  expect(refus.status()).toBe(503);
  await page.getByRole("link", { name: /Mes données/ }).click();
  await expect(page).toHaveURL(/\/espace\/mes-donnees$/);
  await page.goto("/aide");
  await expect(page.getByText("L'assistant d'aide est momentanément indisponible.")).toBeVisible();

  // Pas de nouvelle inscription pendant la fermeture.
  const nouveau = await browser.newPage();
  await seConnecter(nouveau, NOUVEL_ELEVE).catch(() => undefined);
  await nouveau.goto("/inscription");
  await expect(nouveau).toHaveURL(/\/indisponible$/);
  await nouveau.close();

  await admin.getByRole("button", { name: "Rouvrir l'accès des élèves" }).click();
  await expect(admin.getByRole("status").first()).toContainText("ouvert");
  await admin.close();
  await page.goto("/espace");
  await expect(page).toHaveURL(/\/espace$/);
  const [audit] = await executerSql(
    `select count(*) filter (where action = 'fermeture_acces_eleves')::int as fermetures,
            count(*) filter (where action = 'ouverture_acces_eleves')::int as ouvertures
     from journal_audit`,
  );
  expect(audit).toEqual({ fermetures: 1, ouvertures: 1 });
});
