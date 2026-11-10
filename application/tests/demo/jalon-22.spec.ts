import { expect, test, type Page } from "@playwright/test";
import {
  creerAdministrateurFictif,
  inscrireEleveActif,
  seConnecter,
  validerChapitresFictifs,
} from "../bout-en-bout/outils";

// Captures du Jalon 22 (exportabilité), sur téléphone simulé, données FICTIVES : le pays fictif Z vu par ses
// élèves, son administration et son enseignant, avec ses « Années » et ses « options » venues du pack, puis
// l'étanchéité avec le Gabon. Rien n'est effacé. Régénérer : pnpm demo:captures tests/demo/jalon-22.spec.ts
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_22 ?? "../docs/demo/jalon-22";
let numero = 0;
async function capture(page: Page, nom: string, pleinePage = false) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: pleinePage,
  });
}

test.use({ locale: "fr-FR" });

const ADMIN = "+999 000 041 01";
const ENSEIGNANT = "+999 000 041 02";
const ELEVE_Z = "+999 000 041 03";
const ELEVE_OPTION = "+999 000 041 04";
const ELEVE_GABON = "+999 000 041 05";
const REFERENTIEL = "zz-general";
const NOM = "Année 2 A (pays Z, démonstration)";

test("parcours du Jalon 22 : le pays fictif Z", async ({ page }) => {
  test.setTimeout(240_000);
  await validerChapitresFictifs("zz-an2-mathematiques", 2);
  await creerAdministrateurFictif(ADMIN);

  // 1. Inscription : les classes et le mot « option » du pays Z.
  await seConnecter(page, ELEVE_OPTION);
  await page.getByLabel("Ton prénom ou un pseudonyme").fill("Élève fictif Z");
  await page.getByLabel("Pays et programme").selectOption({ value: REFERENTIEL });
  await page.getByLabel("Ta classe").selectOption({ label: "Année 4" });
  await page.getByLabel("Option", { exact: true }).selectOption({ value: "SCI" });
  await page.getByLabel("Option", { exact: true }).scrollIntoViewIfNeeded();
  await capture(page, "inscription-option");
  await page.getByLabel("J'ai 16 ans ou plus").check();
  await page.getByRole("button", { name: "M'inscrire" }).click();
  await expect(page).toHaveURL(/\/espace$/);
  await expect(page.getByText("option")).toBeVisible();
  await capture(page, "espace-option");

  // 2. Administration : un formulaire par pays, avec ses classes et son mot.
  await page.context().clearCookies();
  await seConnecter(page, ADMIN);
  await page.goto("/administration/classes");
  const section = page.getByRole("region", { name: new RegExp(`référentiel ${REFERENTIEL}`) });
  await section.getByLabel("Niveau").selectOption({ label: "Année 2" });
  await section.getByLabel(/Nom de la classe/).fill(NOM);
  await section.getByLabel("Établissement").fill("École fictive du pays Z");
  await section.getByLabel(/Capacité de la classe/).fill("30");
  await section.getByRole("heading").scrollIntoViewIfNeeded();
  await capture(page, "formulaire-classe-pays-z", true);
  await section.getByRole("button", { name: "Créer la classe" }).click();
  const affiches = section.locator(".code");
  await expect(affiches).toHaveCount(2);
  const [codeClasse, codeEnseignant] = (await affiches.allTextContents()).map((t) => t.trim());

  // 3. Un élève du pays Z rejoint la classe et ouvre ses cours.
  await page.context().clearCookies();
  await inscrireEleveActif(page, ELEVE_Z, "Année 2", undefined, REFERENTIEL);
  await page.goto("/espace");
  await page.getByLabel(/Code de ta classe/).fill(codeClasse);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.getByText(`Tu fais partie de la classe ${NOM}`)).toBeVisible();
  await page.goto("/catalogue");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes cours — Année 2");
  await capture(page, "mes-cours-pays-z");
  await page.goto("/catalogue/zz-an2-mathematiques");
  await capture(page, "matiere-pays-z");

  // 4. L'enseignant du pays Z.
  await page.context().clearCookies();
  await seConnecter(page, ENSEIGNANT);
  await page.goto("/enseignant/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Enseignant fictif Z");
  await page.getByLabel("Code d'invitation").fill(codeEnseignant);
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page.getByText("Niveau : Année 2")).toBeVisible();
  await capture(page, "enseignant-pays-z");

  // 5. Étanchéité : un élève du Gabon ne rejoint pas la classe du pays Z.
  await page.context().clearCookies();
  await inscrireEleveActif(page, ELEVE_GABON, "3e");
  await page.goto("/espace");
  await page.getByLabel(/Code de ta classe/).fill(codeClasse);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.locator(".erreur")).toContainText(
    "Ce code correspond à une autre classe que la tienne.",
  );
  await page.locator(".erreur").scrollIntoViewIfNeeded();
  await capture(page, "gabon-code-pays-z-refuse");
});
