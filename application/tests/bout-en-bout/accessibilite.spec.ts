import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  creerAdministrateurFictif,
  creerInvitationFictive,
  executerSql,
  inscrireEleveActif,
  seConnecter,
  validerChapitresFictifs,
} from "./outils";

// Accessibilité (Jalon 7, étape 1 ; ADR 0054) : audit automatique WCAG 2.1 niveaux A et AA de chaque page, pour
// chaque public (visiteur, élève, parent, référent, administration), sur téléphone simulé. Aucune violation admise :
// une régression fait échouer le test, avec la règle et l'élément en cause.
test.describe.configure({ mode: "serial" });

const ELEVE = "+999 000 012 01";
const REFERENT = "+999 000 012 02";
const ADMIN = "+999 000 012 03";

async function auditer(page: Page, nom: string) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const violations = resultat.violations.map(
    (v) =>
      `${nom} — ${v.id} (${v.impact}) : ${v.help} → ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join(" | ")}`,
  );
  expect.soft(violations, violations.join("\n")).toEqual([]);
}

async function idChapitre(unite: string, code: string): Promise<string> {
  const [c] = await executerSql(
    "select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 and c.code = $2",
    [unite, code],
  );
  return c.id;
}

test("visiteur : accueil, connexion, code, aide, hors ligne, indisponible, page introuvable", async ({
  page,
}) => {
  for (const [adresse, nom] of [
    ["/", "accueil"],
    ["/connexion", "connexion"],
    ["/aide", "aide"],
    ["/hors-ligne", "hors ligne"],
    ["/indisponible", "indisponible"],
    ["/adresse-inexistante", "page introuvable"],
  ]) {
    await page.goto(adresse);
    await auditer(page, nom);
  }
  // Formulaire en erreur : le message doit rester accessible.
  await page.goto("/connexion");
  await page.getByLabel("Ton numéro de téléphone").fill("pas un numéro");
  await page.getByRole("button", { name: "Recevoir un code" }).click();
  await expect(page.locator(".erreur")).toBeVisible();
  await auditer(page, "connexion en erreur");
  await page.getByLabel("Ton numéro de téléphone").fill(ELEVE);
  await page.getByRole("button", { name: "Recevoir un code" }).click();
  await expect(page.getByRole("heading", { name: "Entre ton code" })).toBeVisible();
  await auditer(page, "code");
});

test("élève : inscription, espace, catalogue, chapitre, quiz, plan, mes données", async ({
  page,
}) => {
  await validerChapitresFictifs("ga-4e-mathematiques", 2);
  await seConnecter(page, ELEVE);
  await expect(page).toHaveURL(/\/inscription$/);
  await auditer(page, "inscription");
  await page.context().clearCookies();
  await inscrireEleveActif(page, ELEVE, "4e");
  for (const [adresse, nom] of [
    ["/espace", "espace élève"],
    ["/catalogue", "catalogue"],
    ["/catalogue/ga-4e-mathematiques", "chapitres d'une unité"],
    ["/catalogue/ga-4e-mathematiques/puissances", "chapitre"],
    ["/espace/plan", "plan de révision"],
    ["/espace/mes-donnees", "mes données"],
    ["/espace/questionnaire", "questionnaire"],
  ]) {
    await page.goto(adresse);
    await auditer(page, nom);
  }
  // Thème sombre (choisi par le téléphone) : mêmes règles, contrastes compris.
  await page.emulateMedia({ colorScheme: "dark" });
  for (const adresse of ["/espace", "/catalogue/ga-4e-mathematiques/puissances"]) {
    await page.goto(adresse);
    await auditer(page, `${adresse} (thème sombre)`);
  }
  await page.emulateMedia({ colorScheme: "light" });

  await page.goto("/catalogue/ga-4e-mathematiques/puissances");
  await page.getByLabel("Ta question").fill("Comment calculer 2 puissance 3 ?");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeEnabled();
  await auditer(page, "chapitre avec échange");
});

test("parent : page d'accord", async ({ page }) => {
  await page.goto("/developpement/messages");
  const texte = await page
    .locator(".messages li")
    .filter({ hasText: "+999111001201" })
    .first()
    .innerText();
  const lien = texte.match(/https?:\/\/\S+\/parent\/confirmer\?jeton=[0-9a-f]+/)![0];
  await page.goto(lien);
  await auditer(page, "accord du parent");
});

test("référent : espace, chapitre, liens, conformité", async ({ page }) => {
  await creerInvitationFictive("TEST-A11Y-0001", ["mathematiques"]);
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await auditer(page, "activation du référent");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif accessibilité");
  await page.getByLabel("Code d'invitation").fill("TEST-A11Y-0001");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await auditer(page, "espace référent");
  await page.goto(
    `/referent/chapitres/${await idChapitre("ga-4e-mathematiques", "calcul-litteral")}`,
  );
  await auditer(page, "chapitre (référent)");
  await page.goto("/referent/prerequis");
  await auditer(page, "liens de prérequis");
  await page.goto("/referent/conformite");
  await auditer(page, "conformité");
});

test("administration : tableau, pilotage, recrutement", async ({ page }) => {
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  for (const [adresse, nom] of [
    ["/administration", "administration"],
    ["/administration/exploitation", "pilotage"],
    ["/administration/recrutement", "recrutement"],
  ]) {
    await page.goto(adresse);
    await auditer(page, nom);
  }
});

// Au-delà de l'audit automatique : ce qu'un outil ne voit pas seul.
const PAGES_ELEVE = [
  "/espace",
  "/catalogue",
  "/catalogue/ga-4e-mathematiques",
  "/catalogue/ga-4e-mathematiques/puissances",
  "/espace/plan",
  "/espace/mes-donnees",
];

test("reflow : rien ne déborde sur un écran de 320 px (texte agrandi compris)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await seConnecter(page, ELEVE);
  for (const adresse of ["/connexion", "/aide", ...PAGES_ELEVE]) {
    if (adresse === "/connexion") await page.context().clearCookies();
    await page.goto(adresse);
    const deborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect.soft(deborde, `${adresse} déborde de ${deborde} px`).toBeLessThanOrEqual(0);
    if (adresse === "/connexion") await seConnecter(page, ELEVE);
  }
  // Texte agrandi à 200 % (réglage du téléphone) : toujours sans défilement horizontal.
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  const deborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(deborde, "texte à 200 % : débordement").toBeLessThanOrEqual(0);
});

test("zones à toucher : boutons et champs d'au moins 44 px de haut sur les pages des élèves", async ({
  page,
}) => {
  await seConnecter(page, ELEVE);
  for (const adresse of PAGES_ELEVE) {
    await page.goto(adresse);
    const petits = await page.evaluate(() =>
      [...document.querySelectorAll("button, .bouton, select, input:not([type=hidden])")]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const type = (e as HTMLInputElement).type;
          if (r.width === 0 && r.height === 0) return false;
          // Cases à cocher et boutons radio : cible agrandie par leur libellé.
          if (type === "checkbox" || type === "radio") return r.height < 20;
          return r.height < 44;
        })
        .map(
          (e) =>
            `${e.tagName.toLowerCase()} « ${(e.textContent || (e as HTMLInputElement).name || "").trim().slice(0, 30)} »`,
        ),
    );
    expect.soft(petits, `${adresse} : ${petits.join(", ")}`).toEqual([]);
  }
});

test("clavier : connexion complète sans souris, focus toujours visible", async ({ page }) => {
  await page.goto("/connexion");
  const champ = page.getByLabel("Ton numéro de téléphone");
  for (let i = 0; i < 15 && !(await champ.evaluate((e) => e === document.activeElement)); i++)
    await page.keyboard.press("Tab");
  await expect(champ).toBeFocused();
  const contour = await champ.evaluate((e) => getComputedStyle(e).outlineStyle);
  expect(contour).not.toBe("none");
  await page.keyboard.type(ELEVE);
  await page.keyboard.press("Tab");
  const bouton = page.getByRole("button", { name: "Recevoir un code" });
  await expect(bouton).toBeFocused();
  expect(await bouton.evaluate((e) => getComputedStyle(e).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Entre ton code" })).toBeVisible();
  await page.keyboard.type("123456");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/(espace|inscription)$/);
});
