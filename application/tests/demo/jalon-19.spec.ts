import { devices, expect, test, type Page } from "@playwright/test";
import {
  creerAdministrateurFictif,
  creerInvitationFictive,
  executerSql,
  inscrireEleveActif,
  seConnecter,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 19, sur téléphone simulé, données FICTIVES : une journée d'ouverture en
// petit (classe de 6, chapitre et quiz validés, 6 élèves, un 7e refusé) — l'élève dans sa classe, l'enseignant
// et ses chiffres d'ensemble, l'alerte « classe complète » de l'administration. Captures du kit du référent :
// tests/demo/kit-referent.spec.ts.
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_19 ?? "../docs/demo/jalon-19";
let numero = 0;
async function capture(page: Page, nom: string, pleinePage = false) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: pleinePage,
  });
}

test.use({ locale: "fr-FR" });

const ADMIN = "+999 000 040 90";
const ENSEIGNANT = "+999 000 040 91";
const REFERENT = "+999 000 040 92";
const NOM = "5e B (démonstration)";
const UNITE = "ga-5e-mathematiques";
const CHAPITRE = "statistiques-moyenne";
const TITRE = "Statistiques : moyenne";

test("journée d'ouverture en petit", async ({ page, browser }) => {
  test.setTimeout(300_000);
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  await page.goto("/administration/classes");
  const section = page.getByRole("region", { name: /référentiel ga-general/ });
  await section.getByLabel("Niveau").selectOption({ label: "5e" });
  await section.getByLabel(/Nom de la classe/).fill(NOM);
  await section.getByLabel("Établissement").fill("Collège fictif");
  await section.getByLabel(/Capacité de la classe/).fill("6");
  await section.getByRole("button", { name: "Créer la classe" }).click();
  const affiches = section.locator(".code");
  await expect(affiches).toHaveCount(2);
  const [codeClasse, codeEnseignant] = (await affiches.allTextContents()).map((t) => t.trim());

  await page.context().clearCookies();
  await seConnecter(page, ENSEIGNANT);
  await page.goto("/enseignant/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("M. Exemple");
  await page.getByLabel("Code d'invitation").fill(codeEnseignant);
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/enseignant$/);

  await page.context().clearCookies();
  await creerInvitationFictive("TEST-DEMO-0019", ["mathematiques"]);
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif");
  await page.getByLabel("Code d'invitation").fill("TEST-DEMO-0019");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  const [{ id }] = await executerSql(
    `select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 and c.code = $2`,
    [UNITE, CHAPITRE],
  );
  await page.goto(`/referent/chapitres/${id}`);
  await page.getByLabel(/Commentaire/).fill("Relu (fictif).");
  await page.getByRole("button", { name: /Valider la version 1/ }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await page.goto(`/referent/chapitres/${id}`);
  await page.getByLabel("Nombre de questions").fill("3");
  await page.getByRole("button", { name: "Générer un quiz brouillon" }).click();
  await expect(page.getByRole("status")).toContainText("Quiz version 1 créé");
  const [{ id: quiz }] = await executerSql("select id from quiz where chapitre_id = $1", [id]);
  await page.goto(`/referent/quiz/${quiz}`);
  await page.getByLabel(/J'ai vérifié les points/).check();
  await page.getByRole("button", { name: "Valider la version 1" }).click();
  await expect(page.getByText("Statut : Validé")).toBeVisible();

  // Six élèves : inscription, classe, chapitre, quiz.
  for (let i = 1; i <= 6; i += 1) {
    const ctx = await browser.newContext({
      ...devices["Pixel 7"],
      baseURL: "http://localhost:3100",
    });
    const eleve = await ctx.newPage();
    await inscrireEleveActif(eleve, `+999 000 040 0${i}`, "5e");
    await eleve.goto("/espace");
    await eleve.getByLabel(/Code de ta classe/).fill(codeClasse);
    await eleve.getByRole("button", { name: "Rejoindre ma classe" }).click();
    await expect(eleve.getByText(`Tu fais partie de la classe ${NOM}`)).toBeVisible();
    if (i === 1) await capture(eleve, "eleve-dans-sa-classe");
    await eleve.goto(`/catalogue/${UNITE}`);
    await eleve.getByRole("link", { name: TITRE }).click();
    await eleve.getByRole("link", { name: "Faire le quiz du chapitre" }).click();
    await eleve.getByLabel("4", { exact: true }).check();
    await eleve.getByLabel("Faux").check();
    await eleve.getByLabel("Ta réponse à la question 3").fill("3 × 4 = 12");
    await eleve.getByRole("button", { name: "Envoyer mes réponses" }).click();
    await expect(eleve.getByText(/Ton score : \d+ \/ 100/)).toBeVisible();
    await ctx.close();
  }

  // Un 7e élève : classe complète.
  const ctx = await browser.newContext({ ...devices["Pixel 7"], baseURL: "http://localhost:3100" });
  const septieme = await ctx.newPage();
  await inscrireEleveActif(septieme, "+999 000 040 07", "5e");
  await septieme.goto("/espace");
  await septieme.getByLabel(/Code de ta classe/).fill(codeClasse);
  await septieme.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(septieme.locator(".erreur")).toContainText("Cette classe est complète");
  await ctx.close();

  // Le soir : l'enseignant, puis l'administration.
  await page.context().clearCookies();
  await seConnecter(page, ENSEIGNANT);
  await expect(page.getByText("Élèves inscrits dans la classe : 6")).toBeVisible();
  const carte = page
    .getByRole("list", { name: `Avancement de la classe ${NOM}` })
    .getByRole("listitem")
    .filter({ hasText: TITRE });
  await carte.scrollIntoViewIfNeeded();
  await capture(page, "enseignant-chiffres-de-la-classe", true);

  await page.context().clearCookies();
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  const alerte = page.getByText(`Classe « ${NOM} » (Collège fictif) complète`).first();
  await alerte.scrollIntoViewIfNeeded();
  await capture(page, "administration-alerte-classe-complete");
});
