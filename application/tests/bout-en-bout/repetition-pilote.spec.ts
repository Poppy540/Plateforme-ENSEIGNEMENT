import { expect, test } from "@playwright/test";
import {
  creerAdministrateurFictif,
  creerInvitationFictive,
  executerSql,
  identifiantSimule,
  inscrireEleveActif,
  seConnecter,
} from "./outils";

// Répétition complète du pilote (Jalon 6, étape 6 ; docs/pilote/repetition.md), sur la base locale et avec des
// données FICTIVES : le référent valide un chapitre et son quiz, un élève s'inscrit avec l'accord de son parent,
// suit le cours, passe le quiz, demande un plan ; une détresse alerte l'équipe de veille, l'administration la
// traite ; puis un incident : accès fermé, sessions fermées, réouverture. Une unité à part (6e) : aucun autre test
// n'y touche.
test.describe.configure({ mode: "serial" });

const REFERENT = "+999 000 010 01";
const ELEVE = "+999 000 010 02";
const ADMIN = "+999 000 010 03";
const VEILLE = "+999 900 000 01"; // contact FICTIF de l'équipe de veille (playwright.config.ts)
const TITRE = "Nombres entiers : lecture, comparaison, repérage";

async function idChapitre(): Promise<string> {
  const [c] = await executerSql(
    `select c.id from chapitres c join unites u on u.id = c.unite_id
     where u.code = 'ga-6e-mathematiques' and c.code = 'entiers'`,
  );
  return c.id;
}

test("1. le référent active son accès, valide le chapitre puis son quiz", async ({ page }) => {
  await creerInvitationFictive("TEST-REPE-0001", ["mathematiques"]);
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif répétition");
  await page.getByLabel("Code d'invitation").fill("TEST-REPE-0001");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);

  await page.goto(`/referent/chapitres/${await idChapitre()}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITRE);
  await page.getByLabel(/Commentaire/).fill("Relu pour la répétition (fictif).");
  await page.getByRole("button", { name: /Valider la version 1/ }).click();
  await expect(page).toHaveURL(/\/referent$/);

  await page.goto(`/referent/chapitres/${await idChapitre()}`);
  await page.getByLabel("Nombre de questions").fill("3");
  await page.getByRole("button", { name: "Générer un quiz brouillon" }).click();
  await expect(page.getByRole("status")).toContainText("Quiz version 1 créé");
  await page.goto("/referent");
  await page.getByRole("link", { name: `Quiz : ${TITRE}` }).click();
  await page.getByLabel(/J'ai vérifié les points/).check();
  await page.getByRole("button", { name: "Valider la version 1" }).click();
  await expect(page.getByText("Statut : Validé")).toBeVisible();
});

test("2. l'élève s'inscrit avec l'accord de son parent, suit le cours, passe le quiz, obtient un plan", async ({
  page,
}) => {
  await inscrireEleveActif(page, ELEVE, "6e");
  await page.goto("/catalogue/ga-6e-mathematiques");
  await page.getByRole("link", { name: TITRE }).click();
  await expect(page.getByText("est une intelligence artificielle")).toBeVisible();
  await page.getByLabel("Ta question").fill("Comment comparer 1 203 et 1 230 ?");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeEnabled();
  await expect(page.locator(".echange-professeur").last()).not.toBeEmpty();

  await page.getByRole("link", { name: "Faire le quiz du chapitre" }).click();
  await page.getByLabel("4", { exact: true }).check();
  await page.getByLabel("Faux").check();
  await page.getByLabel("Ta réponse à la question 3").fill("3 × 4 = 12");
  await page.getByRole("button", { name: "Envoyer mes réponses" }).click();
  await expect(page.getByText(/Ton score : \d+ \/ 100 \(enregistré\)/)).toBeVisible();

  await page.goto("/espace/plan");
  await page.getByRole("button", { name: "Mettre à jour mon plan" }).click();
  await expect(page.getByRole("heading", { name: /Ton plan/ })).toBeVisible();
});

test("3. une détresse alerte l'équipe de veille sans donnée d'élève ; l'administration la traite", async ({
  page,
  browser,
}) => {
  await seConnecter(page, ELEVE);
  await page.goto("/catalogue/ga-6e-mathematiques");
  await page.getByRole("link", { name: TITRE }).click();
  await page.getByLabel("Ta question").fill("Je suis triste et j'ai peur de l'examen");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeEnabled();
  await expect(page.locator(".echange-professeur").last()).toContainText("adulte de confiance");

  await page.goto("/developpement/messages");
  const alerte = page.locator(".messages li").filter({ hasText: VEILLE });
  await expect(alerte.first()).toContainText("priorité 1");
  expect(await alerte.first().innerText()).not.toMatch(/Élève fictif|triste|\+999 000 010/);

  await creerAdministrateurFictif(ADMIN);
  const admin = await browser.newPage();
  await seConnecter(admin, ADMIN);
  await admin.goto("/administration");
  // Le signalement de CET élève (la file peut en contenir d'autres, laissés par d'autres tests).
  const [signalement] = await executerSql(
    `select id from signalements where eleve_id = $1 and motif = 'detresse' and traite_le is null`,
    [identifiantSimule(ELEVE)],
  );
  const element = admin.getByRole("listitem").filter({
    has: admin.locator(`input[name="id"][value="${signalement.id}"]`),
  });
  await expect(element).toContainText("IMMÉDIAT");
  await element.getByRole("button", { name: "Marquer comme traité" }).click();
  await expect
    .poll(async () => {
      const [s] = await executerSql(
        "select traite_le is not null as traite from signalements where id = $1",
        [signalement.id],
      );
      return s.traite;
    })
    .toBe(true);
  await admin.close();
});

test("4. incident : accès des élèves fermé, toutes les sessions fermées, puis réouverture", async ({
  page,
  browser,
}) => {
  await seConnecter(page, ELEVE);
  const admin = await browser.newPage();
  await seConnecter(admin, ADMIN);
  await admin.goto("/administration");
  await admin.getByLabel(/Motif/).fill("Répétition d'incident (fictif)");
  await admin.getByRole("button", { name: "Fermer l'accès des élèves" }).click();
  await expect(admin.getByRole("status").first()).toContainText("fermé");
  await page.goto("/espace");
  await expect(page).toHaveURL(/\/indisponible$/);

  await admin.getByLabel("Je confirme").last().check();
  await admin.getByRole("button", { name: "Déconnecter toutes les sessions" }).click();
  await admin.reload();
  await expect(admin.getByRole("heading", { name: "Administration" })).toBeVisible();
  await page.goto("/espace/mes-donnees");
  await expect(page).toHaveURL(/\/connexion$/);

  await admin.getByRole("button", { name: "Rouvrir l'accès des élèves" }).click();
  await expect(admin.getByRole("status").first()).toContainText("ouvert");
  await seConnecter(page, ELEVE);
  await page.goto("/catalogue/ga-6e-mathematiques");
  await expect(page.getByRole("link", { name: TITRE })).toBeVisible();
  await admin.close();
});

test("5. bilan : le pilotage montre l'activité, sans aucun élève identifiable", async ({
  page,
}) => {
  await seConnecter(page, ADMIN);
  await page.goto("/administration/exploitation");
  await expect(page.getByRole("heading", { name: "Pilotage de l'exploitation" })).toBeVisible();
  const csv = await (await page.request.get("/api/administration/export?jours=7")).text();
  expect(csv).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  expect(csv).not.toContain("+999");
});
