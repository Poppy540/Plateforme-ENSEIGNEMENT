import { expect, test } from "@playwright/test";
import {
  creerInvitationFictive,
  executerSql,
  identifiantSimule,
  inscrireEleveActif,
  seConnecter,
  validerChapitresFictifs,
} from "./outils";

// Famille Mathématiques au collège (Jalon 4, étape 1, ADR 0037) : graphe de prérequis entre classes validé
// par le référent, catalogue d'une autre classe, Tuteur qui remonte à une notion de 4e.
test.describe.configure({ mode: "serial" });

const REFERENT = "+999 000 001 70";
const ELEVE_4E = "+999 000 001 71";
const ELEVE_3E = "+999 000 001 72";

async function idChapitre(unite: string, code: string): Promise<string> {
  const [c] = await executerSql(
    `select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 and c.code = $2`,
    [unite, code],
  );
  return c.id;
}

test("le référent valide un lien de prérequis entre classes ; un rejet exige un commentaire", async ({
  page,
}) => {
  await creerInvitationFictive("TEST-FAMI-0001", ["mathematiques"]);
  await seConnecter(page, REFERENT);
  await page.getByRole("link", { name: "Activer votre accès avec votre code" }).click();
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif famille");
  await page.getByLabel("Code d'invitation").fill("TEST-FAMI-0001");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await expect(
    page.getByRole("heading", { name: /Liens de prérequis à valider \(\d+\)/ }),
  ).toBeVisible();

  await page.goto(`/referent/chapitres/${await idChapitre("ga-3e-mathematiques", "thales")}`);
  const triangles = page
    .getByRole("listitem")
    .filter({ hasText: "Triangles semblables (initiation)" });
  await expect(triangles).toContainText("4e");
  await expect(triangles).toContainText("À valider");
  await page
    .getByRole("button", { name: "Valider le lien avec Triangles semblables (initiation)" })
    .click();
  await expect(triangles).toContainText("Validé");

  const fractions = page
    .getByRole("listitem")
    .filter({ hasText: "Fractions : opérations complètes" });
  await fractions.getByRole("button", { name: /Rejeter le lien/ }).click();
  await expect(fractions.getByRole("alert")).toContainText("Expliquez pourquoi");
  await fractions
    .getByLabel(/Remarque sur ce lien/)
    .fill("Utile, mais pas nécessaire pour Thalès.");
  await fractions.getByRole("button", { name: /Rejeter le lien/ }).click();
  await expect(fractions).toContainText("Rejeté");
  await expect(fractions).toContainText("pas nécessaire pour Thalès");

  const [trace] = await executerSql(
    `select count(*) filter (where statut = 'valide')::int as valides,
            count(*) filter (where statut = 'rejete')::int as rejetes
     from prerequis_chapitres where decide_par = $1`,
    [identifiantSimule(REFERENT)],
  );
  expect(trace).toEqual({ valides: 1, rejetes: 1 });
});

test("le catalogue d'un élève de 4e liste les mathématiques de 4e, pas celles d'une autre classe", async ({
  page,
}) => {
  await validerChapitresFictifs("ga-4e-mathematiques", 8);
  await inscrireEleveActif(page, ELEVE_4E, "4e");
  await page.goto("/catalogue");
  await expect(page.locator('a[href="/catalogue/ga-4e-mathematiques"]')).toBeVisible();
  await expect(page.locator('a[href^="/catalogue/ga-3e-"]')).toHaveCount(0);
  await page.goto("/catalogue/ga-4e-mathematiques");
  await expect(page.getByText("Théorème de Pythagore")).toBeVisible();
});

test("le Tuteur remonte, par un lien validé, à une notion de base de la classe inférieure", async ({
  page,
}) => {
  await inscrireEleveActif(page, ELEVE_3E, "3e");
  await executerSql(
    `insert into progression (eleve_id, chapitre_id, statut, score)
     values ($1, $2, 'en_cours', 20)
     on conflict (eleve_id, chapitre_id) do update set statut = 'en_cours', score = 20`,
    [identifiantSimule(ELEVE_3E), await idChapitre("ga-3e-mathematiques", "thales")],
  );
  await page.goto("/espace/plan");
  await page.getByRole("button", { name: "Mettre à jour mon plan" }).click();
  await expect(page.getByRole("heading", { name: /Ton plan/ })).toBeVisible();
  await expect(
    page.locator("section ol li").filter({ hasText: "Triangles semblables (initiation)" }),
  ).toBeVisible();
});
