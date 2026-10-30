import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { creerAdministrateurFictif, inscrireEleveActif, seConnecter } from "./outils";

// Classes créées et gérées depuis l'administration (Jalon 10, étape 2 ; ADR 0067). Comptes fictifs.
test.describe.configure({ mode: "serial" });

const ADMIN = "+999 000 018 01";
const ENSEIGNANT = "+999 000 018 02";
const ELEVE = "+999 000 018 03";
const ELEVE_EN_TROP = "+999 000 018 04";
const NOM = "3e C (administration)";
const codes: { classe?: string; enseignant?: string; nouveau?: string } = {};

async function auditer(page: Page, nom: string) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const violations = resultat.violations.map((v) => `${nom} — ${v.id} : ${v.help}`);
  expect.soft(violations, violations.join("\n")).toEqual([]);
}

function carte(page: Page) {
  return page.locator(".carte").filter({ hasText: NOM });
}

test("l'administration crée une classe ; ses deux codes s'affichent une seule fois", async ({
  page,
}) => {
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await page.getByRole("link", { name: "Classes du pilote" }).click();
  await expect(page.getByRole("heading", { name: "Classes du pilote" })).toBeVisible();
  await auditer(page, "classes, formulaire");

  const section = page.getByRole("region", { name: /référentiel ga-general/ });
  await section.getByLabel("Niveau").selectOption({ label: "3e" });
  await section.getByLabel(/Nom de la classe/).fill(NOM);
  await section.getByLabel("Établissement").fill("Collège fictif");
  // Capacité (décision D10) : un seul élève, pour essayer la classe pleine plus loin.
  await section.getByLabel(/Capacité de la classe/).fill("1");
  await section.getByRole("button", { name: "Créer la classe" }).click();
  const affiches = section.locator(".code");
  await expect(affiches).toHaveCount(2);
  [codes.classe, codes.enseignant] = (await affiches.allTextContents()).map((t) => t.trim());
  await auditer(page, "classes, codes affichés");
  await page.reload();
  await expect(page.locator("main")).not.toContainText(codes.classe!);
  await expect(carte(page)).toContainText("Élèves rattachés : 0 sur 1 (capacité)");
  await expect(carte(page)).toContainText("invitation en attente");
});

test("l'enseignant et l'élève utilisent les codes ; la liste les compte", async ({ page }) => {
  await seConnecter(page, ENSEIGNANT);
  await page.goto("/enseignant/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Enseignant fictif C");
  await page.getByLabel("Code d'invitation").fill(codes.enseignant!);
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/enseignant$/);

  await page.context().clearCookies();
  await inscrireEleveActif(page, ELEVE, "3e");
  await page.goto("/espace");
  await page.getByLabel(/Code de ta classe/).fill(codes.classe!);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.getByText(`Tu fais partie de la classe ${NOM}`)).toBeVisible();

  await page.context().clearCookies();
  await seConnecter(page, ADMIN);
  await page.goto("/administration/classes");
  await expect(carte(page)).toContainText("Élèves rattachés : 1");
  await expect(carte(page)).toContainText("Enseignant fictif C");
});

test("nouveau code de classe (l'ancien ne marche plus), nouvelle invitation puis annulation", async ({
  page,
}) => {
  await seConnecter(page, ADMIN);
  await page.goto("/administration/classes");
  await carte(page)
    .getByRole("button", { name: /Nouveau code pour la classe/ })
    .click();
  await expect(carte(page).locator(".code")).toHaveCount(1);
  const nouveau = (await carte(page).locator(".code").textContent())!.trim();
  codes.nouveau = nouveau;
  expect(nouveau).not.toBe(codes.classe);

  await carte(page)
    .getByRole("button", { name: /Nouvelle invitation d'enseignant/ })
    .click();
  await expect(carte(page).locator(".code")).toHaveCount(2);
  await page.reload();
  await expect(carte(page)).toContainText("invitation en attente");
  await carte(page)
    .getByRole("button", { name: /Annuler l'invitation en attente/ })
    .click();
  await expect(carte(page)).not.toContainText("invitation en attente");

  // L'élève quitte sa classe : l'ancien code est refusé, le nouveau accepté.
  await page.context().clearCookies();
  await seConnecter(page, ELEVE);
  await page.goto("/espace");
  await page.getByRole("button", { name: "Quitter cette classe" }).click();
  await page.getByLabel(/Code de ta classe/).fill(codes.classe!);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.locator(".erreur")).toContainText("Code de classe inconnu");
  await page.getByLabel(/Code de ta classe/).fill(nouveau);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.getByText(`Tu fais partie de la classe ${NOM}`)).toBeVisible();
});

test("classe pleine : le code est refusé et l'administration alertée ; la capacité se relève (décision D10)", async ({
  page,
}) => {
  await inscrireEleveActif(page, ELEVE_EN_TROP, "3e");
  await page.goto("/espace");
  const nouveau = codes.nouveau!;
  await page.getByLabel(/Code de ta classe/).fill(nouveau);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.locator(".erreur")).toContainText("Cette classe est complète");

  await page.context().clearCookies();
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await expect(page.locator("main")).toContainText(`Classe « ${NOM} » (Collège fictif) complète`);
  await page.goto("/administration/classes");
  await carte(page)
    .getByLabel(/Capacité de la classe/)
    .fill("2");
  await carte(page).getByRole("button", { name: "Enregistrer la capacité" }).click();
  await expect(page.getByRole("status")).toContainText("Capacité enregistrée");
  await expect(carte(page)).toContainText("Élèves rattachés : 1 sur 2 (capacité)");

  await page.context().clearCookies();
  await seConnecter(page, ELEVE_EN_TROP);
  await page.goto("/espace");
  await page.getByLabel(/Code de ta classe/).fill(nouveau);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.getByText(`Tu fais partie de la classe ${NOM}`)).toBeVisible();
});
