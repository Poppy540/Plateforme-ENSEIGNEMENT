import { expect, test, type Page } from "@playwright/test";
import {
  creerAdministrateurFictif,
  creerInvitationFictive,
  seConnecter,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 11 (agents simulés), sur téléphone simulé, données fictives : chapitres du
// pilote choisis par l'administration, accueil du référent, files avec le pilote en tête et prochaine action.
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_11 ?? "../docs/demo/jalon-11";
let numero = 0;
async function capture(page: Page, nom: string, pleinePage = true) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: pleinePage,
  });
}

const ADMIN = "+999 000 021 01";
const REFERENT = "+999 000 021 02";

test("parcours complet du Jalon 11", async ({ page }) => {
  test.setTimeout(240_000);
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);

  // 1. Administration : chapitres du pilote de Mathématiques 3e.
  await page.goto("/administration/pilote");
  await page.getByLabel("Unité").selectOption({ label: "3e — Mathématiques" });
  await page.getByRole("button", { name: "Afficher ses chapitres" }).click();
  for (const titre of ["Théorème de Thalès", "Trigonométrie dans le triangle rectangle"])
    await page.getByRole("checkbox", { name: titre }).check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("status")).toContainText("enregistrés");
  await capture(page, "administration-chapitres-du-pilote");

  // 2. Référent : première visite, encadré de bienvenue et chapitres du pilote en tête.
  await creerInvitationFictive("DEMO-PILO-0011", ["mathematiques"]);
  await page.context().clearCookies();
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif de démonstration");
  await page.getByLabel("Code d'invitation").fill("DEMO-PILO-0011");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await capture(page, "referent-premiere-visite", false);

  // 3. Accueil du référent.
  await page.getByRole("link", { name: /Lire l'accueil/ }).click();
  await expect(
    page.getByRole("heading", { name: "Bienvenue dans l'espace référent" }),
  ).toBeVisible();
  await capture(page, "referent-accueil");

  // 4. Après l'accueil : la prochaine action de chaque chapitre du pilote, puis la file « À valider ».
  await page.getByRole("button", { name: "Commencer" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await page.getByRole("heading", { name: /^Chapitres du pilote/ }).scrollIntoViewIfNeeded();
  await capture(page, "referent-chapitres-du-pilote-prochaine-action", false);
  await page
    .getByRole("heading", { name: /^À valider/ })
    .evaluate((e) => e.scrollIntoView({ block: "start" }));
  await capture(page, "referent-file-a-valider-pilote-en-tete", false);
});
