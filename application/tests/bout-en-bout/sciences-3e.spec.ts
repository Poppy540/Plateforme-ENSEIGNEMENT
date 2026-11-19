import { expect, test } from "@playwright/test";
import {
  creerInvitationFictive,
  executerSql,
  identifiantSimule,
  inscrireEleveActif,
  seConnecter,
  validerChapitresFictifs,
} from "./outils";

// Famille Sciences en 3e (Jalon 6, étape 3 ; ADR 0050) : le référent de Sciences décide seul d'un lien vers un
// chapitre de Mathématiques, qu'il lit sans pouvoir l'ouvrir ; un élève de 3e trouve SVT et Physique-Chimie.
test.describe.configure({ mode: "serial" });

const REFERENT = "+999 000 007 01";
const ELEVE = "+999 000 007 02";

async function idChapitre(unite: string, code: string): Promise<string> {
  const [c] = await executerSql(
    `select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 and c.code = $2`,
    [unite, code],
  );
  return c.id;
}

test("le référent de Sciences valide un lien vers un chapitre de Mathématiques", async ({
  page,
}) => {
  await creerInvitationFictive("TEST-SCIE-0001", ["sciences"]);
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif sciences");
  await page.getByLabel("Code d'invitation").fill("TEST-SCIE-0001");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);

  await page.goto("/referent/prerequis");
  await expect(page.getByText("Équations du premier degré (Mathématiques, 4e)")).toBeVisible();

  await page.goto(
    `/referent/chapitres/${await idChapitre("ga-3e-physique-chimie", "electricite")}`,
  );
  const equations = page.getByRole("listitem").filter({ hasText: "Équations du premier degré" });
  await expect(equations).toContainText("Mathématiques");
  await expect(equations).toContainText("Autre famille de matières");
  // Pas de lien vers la page du chapitre de Mathématiques (réservée à ses référents).
  await expect(equations.getByRole("link")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Valider le lien avec Équations du premier degré" })
    .click();
  await expect(equations).toContainText("Validé");

  const [trace] = await executerSql(
    `select count(*)::int as n from prerequis_chapitres where decide_par = $1 and statut = 'valide'`,
    [identifiantSimule(REFERENT)],
  );
  expect(trace.n).toBe(1);

  // La page du chapitre de Mathématiques ne lui est pas ouverte.
  await page.goto(
    `/referent/chapitres/${await idChapitre("ga-4e-mathematiques", "equations-premier-degre")}`,
  );
  await expect(page.getByRole("button", { name: /Valider le chapitre/ })).toHaveCount(0);
});

test("un élève de 3e trouve la SVT et la Physique-Chimie une fois les chapitres validés", async ({
  page,
}) => {
  await validerChapitresFictifs("ga-3e-svt", 5);
  await validerChapitresFictifs("ga-3e-physique-chimie", 4);
  await inscrireEleveActif(page, ELEVE, "3e");
  await page.goto("/catalogue");
  await expect(page.locator('a[href="/catalogue/ga-3e-svt"]')).toBeVisible();
  await expect(page.locator('a[href="/catalogue/ga-3e-physique-chimie"]')).toBeVisible();
  await page.goto("/catalogue/ga-3e-physique-chimie");
  await expect(page.getByText("L'électricité : loi d'Ohm, puissance")).toBeVisible();
});
