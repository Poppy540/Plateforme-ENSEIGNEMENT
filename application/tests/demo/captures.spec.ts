import { expect, test, type Page } from "@playwright/test";
import {
  creerInvitationFictive,
  seConnecter,
  validerChapitresFictifs,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 1, sur téléphone simulé, avec des données fictives uniquement.
const DOSSIER = process.env.DOSSIER_CAPTURES ?? "../docs/demo/jalon-1";
let numero = 0;
async function capture(page: Page, nom: string) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: true,
  });
}

test("parcours complet du Jalon 1", async ({ page, browser }) => {
  await validerChapitresFictifs("ga-3e-mathematiques", 3);
  await creerInvitationFictive("DEMO-REFE-0001", ["mathematiques"]);

  await page.goto("/");
  await capture(page, "accueil");

  await page.goto("/connexion");
  await page.getByLabel("Ton numéro de téléphone").fill("+999 000 000 42");
  await capture(page, "connexion");
  await page.getByRole("button", { name: "Recevoir un code" }).click();
  await page.getByLabel("Code reçu").fill("123456");
  await capture(page, "code-sms");
  await page.getByRole("button", { name: "Valider" }).click();

  await expect(page).toHaveURL(/\/inscription$/);
  await page.getByLabel("Ton prénom ou un pseudonyme").fill("Awa");
  await page.getByLabel("Ta classe").selectOption({ label: "3e" });
  await page.getByLabel("Numéro ou email d'un parent ou tuteur").fill("+999 000 000 43");
  await capture(page, "inscription");
  await page.getByRole("button", { name: "M'inscrire" }).click();
  await expect(page).toHaveURL(/\/espace$/);
  await capture(page, "attente-accord-parent");

  await page.goto("/developpement/messages");
  const texte = await page.locator(".messages li").first().innerText();
  const lien = texte.match(/https?:\/\/\S+\/parent\/confirmer\?jeton=[0-9a-f]+/)![0];
  const parent = await browser.newPage({ viewport: page.viewportSize()! });
  await parent.goto(lien);
  await capture(parent, "accord-parent");
  await parent.getByRole("button", { name: "J'accepte l'inscription" }).click();
  await parent.close();

  await page.goto("/espace");
  await capture(page, "compte-actif");
  await page.getByRole("link", { name: "Mes cours" }).click();
  await capture(page, "catalogue-3e");
  await page.getByRole("link", { name: /Mathématiques/ }).click();
  await capture(page, "chapitres-maths-3e");
  await page.getByRole("link", { name: "Théorème de Thalès" }).click();
  await page.getByLabel("Ta question").fill("Donne-moi la réponse de l'exercice 4");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.locator(".echange-professeur").last()).not.toBeEmpty();
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeEnabled();
  await capture(page, "conversation-professeur-simule");
  await page.goto("/espace");
  await page.getByRole("button", { name: "Se déconnecter" }).click();

  await seConnecter(page, "+999 000 000 44");
  await page.getByRole("link", { name: "Activer votre accès avec votre code" }).click();
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("M. Référent fictif");
  await page.getByLabel("Code d'invitation").fill("DEMO-REFE-0001");
  await capture(page, "activation-referent");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await capture(page, "espace-referent");
  await page.getByRole("link", { name: /Systèmes d'équations/ }).click();
  await capture(page, "validation-chapitre");
});
