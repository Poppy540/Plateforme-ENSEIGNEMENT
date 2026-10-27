import { expect, test, type Page } from "@playwright/test";
import { creerAdministrateurFictif, seConnecter } from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 10 (agents simulés), sur téléphone simulé, données fictives : invitations de
// référents et classes du pilote depuis l'administration, codes affichés une seule fois.
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_10 ?? "../docs/demo/jalon-10";
let numero = 0;
async function capture(page: Page, nom: string, pleinePage = true) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: pleinePage,
  });
}

const ADMIN = "+999 000 019 01";
const REFERENT = "+999 000 019 02";

test("parcours complet du Jalon 10", async ({ page }) => {
  test.setTimeout(240_000);
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);

  // 1. Administration : nouveaux liens.
  await page.goto("/administration");
  await capture(page, "administration-liens", false);

  // 2. Invitation d'un référent de Mathématiques : code affiché une seule fois.
  await page.getByRole("link", { name: "Inviter un référent" }).click();
  const ga = page.getByRole("region", { name: "Référentiel ga-general" });
  await ga.getByRole("checkbox", { name: /Mathématiques/ }).check();
  await capture(page, "invitation-formulaire", false);
  await ga.getByRole("button", { name: "Créer l'invitation" }).click();
  const code = (await ga.locator(".code").textContent())!.trim();
  await ga.locator(".code-unique").scrollIntoViewIfNeeded();
  await capture(page, "invitation-code-affiche-une-fois", false);

  // Le référent l'utilise ; une seconde invitation est annulée.
  await page.context().clearCookies();
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif de démonstration");
  await page.getByLabel("Code d'invitation").fill(code);
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await page.context().clearCookies();
  await seConnecter(page, ADMIN);
  await page.goto("/administration/invitations");
  await ga.getByRole("checkbox", { name: /Français/ }).check();
  await ga.getByRole("button", { name: "Créer l'invitation" }).click();
  await expect(ga.locator(".code")).toBeVisible();
  await page.reload();
  await page
    .locator(".carte")
    .filter({ hasText: "en attente" })
    .first()
    .getByRole("button", { name: "Annuler cette invitation" })
    .click();
  await expect(page.locator(".carte").first()).toContainText("annulée");
  await page.getByRole("heading", { name: /^Invitations/ }).scrollIntoViewIfNeeded();
  await capture(page, "invitations-liste-sans-codes", false);

  // 3. Classe du pilote : deux codes affichés une seule fois, puis la liste.
  await page.goto("/administration/classes");
  const section = page.getByRole("region", { name: /référentiel ga-general/ });
  await section.getByLabel("Niveau").selectOption({ label: "3e" });
  await section.getByLabel(/Nom de la classe/).fill("3e A (fictive)");
  await section.getByLabel("Établissement").fill("Collège fictif de démonstration");
  await capture(page, "classe-formulaire", false);
  await section.getByRole("button", { name: "Créer la classe" }).click();
  await expect(section.locator(".code")).toHaveCount(2);
  await section.locator(".code-unique").scrollIntoViewIfNeeded();
  await capture(page, "classe-deux-codes-affiches-une-fois", false);
  await page.reload();
  await page.getByRole("heading", { name: /^Classes \(/ }).scrollIntoViewIfNeeded();
  await capture(page, "classes-liste-et-actions", false);
});
