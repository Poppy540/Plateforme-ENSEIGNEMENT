import { expect, test } from "@playwright/test";
import { executerSql, seConnecter } from "./outils";

const ELEVE = "+999 000 001 01"; // élève de 3e inscrit par les tests du catalogue

test("Tuteur (modèle simulé) : préférences, rappels désactivés par défaut, plan d'au plus trois priorités", async ({
  page,
}) => {
  await seConnecter(page, ELEVE);
  await page.getByRole("link", { name: "Mon plan de révision" }).click();
  await expect(page.getByRole("heading", { name: "Mon plan de révision" })).toBeVisible();
  await expect(page.getByText("Pas encore de plan")).toBeVisible();
  await expect(page.getByLabel(/Recevoir des rappels/)).not.toBeChecked();

  await page.getByLabel("Temps disponible par jour (minutes)").fill("30");
  await page.getByLabel("Ta connexion").selectOption("lente");
  await page.getByRole("button", { name: "Enregistrer mes préférences" }).click();
  await expect(page.getByRole("status")).toContainText("Préférences enregistrées.");

  await page
    .getByLabel("Un mot pour ton tuteur (facultatif)")
    .fill("Je veux réviser six heures par nuit.");
  await page.getByRole("button", { name: "Mettre à jour mon plan" }).click();
  await expect(page.getByRole("heading", { name: /Ton plan/ })).toBeVisible();
  const priorites = page.locator("section ol li");
  expect(await priorites.count()).toBeGreaterThan(0);
  expect(await priorites.count()).toBeLessThanOrEqual(3);
  await expect(page.getByText(/dors suffisamment/)).toBeVisible();

  const [enregistre] = await executerSql(
    `select jsonb_array_length(r.priorites) as n, p.rappels_actifs, p.minutes_par_jour
     from recommandations_tuteur r join preferences_eleves p on p.eleve_id = r.eleve_id
     order by r.cree_le desc limit 1`,
  );
  expect(enregistre.n).toBeLessThanOrEqual(3);
  expect(enregistre).toMatchObject({ rappels_actifs: false, minutes_par_jour: 30 });
});
