import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { creerInvitationFictive, executerSql, inscrireEleveActif, seConnecter } from "./outils";

const NUMERO = "+999 000 003 01";

test("l'élève télécharge toutes ses données", async ({ page }) => {
  await inscrireEleveActif(page, NUMERO, "3e");
  await page.goto("/espace");
  await page.getByRole("link", { name: /Mes données/ }).click();
  const [telechargement] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: /Télécharger/ }).click(),
  ]);
  expect(telechargement.suggestedFilename()).toBe("mes-donnees.json");
  const contenu = JSON.parse(execFileSync("cat", [await telechargement.path()]).toString());
  expect(contenu.profil.prenom_ou_pseudo).toBe("Élève fictif");
  expect(contenu.consentements[0].type).toBe("inscription");
  expect(contenu.consentements[0].accorde_le).not.toBeNull();
});

test("l'export est refusé sans connexion", async ({ request }) => {
  expect((await request.get("/api/mes-donnees")).status()).toBe(401);
});

test("l'élève supprime son compte : toutes ses données disparaissent", async ({ page }) => {
  await seConnecter(page, NUMERO);
  const [{ id }] = await executerSql(
    "select p.id from profils p where p.prenom_ou_pseudo = 'Élève fictif' order by p.cree_le desc limit 1",
  );
  await page.goto("/espace/mes-donnees");

  await page.getByLabel("Pour confirmer, écris SUPPRIMER").fill("oui");
  await page.getByRole("button", { name: "Supprimer définitivement mon compte" }).click();
  await expect(page.locator(".erreur")).toContainText("SUPPRIMER");

  await page.getByLabel("Pour confirmer, écris SUPPRIMER").fill("supprimer");
  await page.getByRole("button", { name: "Supprimer définitivement mon compte" }).click();
  await expect(page).toHaveURL(/\/\?compte=supprime$/);
  await expect(page.getByRole("status")).toContainText("toutes tes données ont été supprimés");

  const restes = await executerSql(
    `select (select count(*) from auth.users where id = $1)::int as auth,
            (select count(*) from profils where id = $1)::int as profil,
            (select count(*) from eleves where id = $1)::int as eleve,
            (select count(*) from consentements where eleve_id = $1)::int as consentements`,
    [id],
  );
  expect(restes[0]).toEqual({ auth: 0, profil: 0, eleve: 0, consentements: 0 });

  // La session est fermée ; le même numéro repart de zéro.
  await page.goto("/espace");
  await expect(page).toHaveURL(/\/connexion$/);
  await seConnecter(page, NUMERO);
  await expect(page).toHaveURL(/\/inscription$/);
});

test("un référent ne peut pas supprimer son compte lui-même", async ({ page }) => {
  await creerInvitationFictive("TEST-SUPP-0001", ["sciences"]);
  await seConnecter(page, "+999 000 003 02");
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif");
  await page.getByLabel("Code d'invitation").fill("TEST-SUPP-0001");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  // Le formulaire n'est pas proposé (l'action du serveur refuse aussi) ; l'export, si (ADR 0049).
  await page.getByRole("link", { name: "Mes données" }).click();
  await expect(page.getByText("se fait avec le propriétaire")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Supprimer définitivement mon compte" }),
  ).toHaveCount(0);
  const donnees = await (await page.request.get("/api/mes-donnees")).json();
  expect(donnees.familles_validees).toEqual([{ referentiel: "ga-general", famille: "sciences" }]);
});
