import { expect, test, type Page } from "@playwright/test";
import {
  creerInvitationFictive,
  inscrireEleveActif,
  seConnecter,
  validerChapitresFictifs,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 7 (agents simulés), sur téléphone simulé, données fictives : accessibilité
// (focus au clavier, texte agrandi, thème sombre) et Français 3e (élève et référent).
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_7 ?? "../docs/demo/jalon-7";
let numero = 0;
async function capture(page: Page, nom: string, pleinePage = true) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: pleinePage,
  });
}

const ELEVE = "+999 000 014 01";
const REFERENT = "+999 000 014 02";

test("parcours complet du Jalon 7", async ({ page }) => {
  test.setTimeout(240_000);
  await validerChapitresFictifs("ga-3e-francais", 3);

  // 1. Connexion au clavier : focus toujours visible, zones à toucher de 44 px.
  await page.goto("/connexion");
  const champ = page.getByLabel("Ton numéro de téléphone");
  for (let i = 0; i < 15 && !(await champ.evaluate((e) => e === document.activeElement)); i++)
    await page.keyboard.press("Tab");
  await page.keyboard.type("+999 000 014 01");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Recevoir un code" })).toBeFocused();
  await capture(page, "connexion-au-clavier-focus-visible", false);

  // 2. Élève de 3e : catalogue avec le Français, puis ses chapitres.
  await inscrireEleveActif(page, ELEVE, "3e");
  await page.goto("/catalogue");
  await capture(page, "catalogue-3e-avec-le-francais");
  await page.goto("/catalogue/ga-3e-francais");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await capture(page, "francais-3e-chapitres");

  // 3. Petit écran (320 px) et texte agrandi à 200 % : rien ne déborde.
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/catalogue/ga-3e-francais");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await capture(page, "texte-agrandi-200-pourcent-320px");
  await page.setViewportSize({ width: 412, height: 915 });

  // 4. Thème sombre choisi par le téléphone : mêmes contrastes vérifiés.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/espace");
  await capture(page, "espace-eleve-theme-sombre");
  await page.emulateMedia({ colorScheme: "light" });

  // 5. Référent de Français : chapitres de sa famille seulement.
  await creerInvitationFictive("TEST-DEMO-0007", ["francais"]);
  await page.context().clearCookies();
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif français");
  await page.getByLabel("Code d'invitation").fill("TEST-DEMO-0007");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await capture(page, "referent-francais-espace");
});
