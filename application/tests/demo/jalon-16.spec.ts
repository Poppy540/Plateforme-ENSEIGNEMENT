import { expect, test, type Page } from "@playwright/test";
import { creerAdministrateurFictif, inscrireEleveActif, seConnecter } from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 16, sur téléphone simulé, données FICTIVES : la capacité de classe
// (décision D10, ADR 0093) — création avec une capacité, classe pleine refusée à l'élève, alerte dans la file
// humaine de l'administration, capacité relevée — puis la limite d'essais de code (ADR 0092). Rien n'est effacé.
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_16 ?? "../docs/demo/jalon-16";
let numero = 0;
async function capture(page: Page, nom: string, pleinePage = true) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: pleinePage,
  });
}

test.use({ locale: "fr-FR" });

const ADMIN = "+999 000 034 01";
const ELEVE = "+999 000 034 02";
const ELEVE_EN_TROP = "+999 000 034 03";
const ELEVE_ESSAIS = "+999 000 034 04";
const NOM = "3e B (démonstration)";

test("parcours complet du Jalon 16", async ({ page }) => {
  test.setTimeout(240_000);
  await creerAdministrateurFictif(ADMIN);

  // 1. Création d'une classe avec sa capacité (1 élève, pour montrer la classe pleine).
  await seConnecter(page, ADMIN);
  await page.goto("/administration/classes");
  const section = page.getByRole("region", { name: /référentiel ga-general/ });
  await section.getByLabel("Niveau").selectOption({ label: "3e" });
  await section.getByLabel(/Nom de la classe/).fill(NOM);
  await section.getByLabel("Établissement").fill("Collège fictif");
  await section.getByLabel(/Capacité de la classe/).fill("1");
  await section.getByLabel(/Capacité de la classe/).scrollIntoViewIfNeeded();
  await capture(page, "formulaire-capacite", false);
  await section.getByRole("button", { name: "Créer la classe" }).click();
  const affiches = section.locator(".code");
  await expect(affiches).toHaveCount(2);
  const codeClasse = (await affiches.first().textContent())!.trim();

  const carte = () => page.locator(".carte").filter({ hasText: NOM });
  await page.reload();
  await expect(carte()).toContainText("Élèves rattachés : 0 sur 1 (capacité)");
  await carte().scrollIntoViewIfNeeded();
  await capture(page, "liste-capacite", false);

  // 2. Un premier élève rejoint la classe ; le second la trouve complète.
  await page.context().clearCookies();
  await inscrireEleveActif(page, ELEVE, "3e");
  await page.goto("/espace");
  await page.getByLabel(/Code de ta classe/).fill(codeClasse);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.getByText(`Tu fais partie de la classe ${NOM}`)).toBeVisible();

  await page.context().clearCookies();
  await inscrireEleveActif(page, ELEVE_EN_TROP, "3e");
  await page.goto("/espace");
  await page.getByLabel(/Code de ta classe/).fill(codeClasse);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.locator(".erreur")).toContainText("Cette classe est complète");
  await page.locator(".erreur").scrollIntoViewIfNeeded();
  await capture(page, "eleve-classe-complete", false);

  // 3. L'alerte dans la file humaine, puis la capacité relevée.
  await page.context().clearCookies();
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  const alerte = page.getByText(`Classe « ${NOM} » (Collège fictif) complète`).first();
  await expect(alerte).toBeVisible();
  await alerte.scrollIntoViewIfNeeded();
  await capture(page, "alerte-classe-complete", false);

  await page.goto("/administration/classes");
  await carte()
    .getByLabel(/Capacité de la classe/)
    .fill("30");
  await carte().getByRole("button", { name: "Enregistrer la capacité" }).click();
  await expect(page.getByRole("status")).toContainText("Capacité enregistrée");
  await expect(carte()).toContainText("Élèves rattachés : 1 sur 30 (capacité)");
  await carte().scrollIntoViewIfNeeded();
  await capture(page, "capacite-relevee", false);

  // 4. Limite d'essais de code : 10 codes faux par compte et par jour, puis refus jusqu'au lendemain.
  await page.context().clearCookies();
  await inscrireEleveActif(page, ELEVE_ESSAIS, "3e");
  await page.goto("/espace");
  for (let i = 0; i < 11; i += 1) {
    await page.getByLabel(/Code de ta classe/).fill(`FAUX-${i}`);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.getByRole("button", { name: "Rejoindre ma classe" }).click(),
    ]);
  }
  await expect(page.locator(".erreur")).toContainText("Trop d'essais de code aujourd'hui");
  await page.locator(".erreur").scrollIntoViewIfNeeded();
  await capture(page, "trop-d-essais", false);
});
