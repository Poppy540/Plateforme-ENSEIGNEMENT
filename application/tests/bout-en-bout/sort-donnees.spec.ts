import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { creerAdministrateurFictif, executerSql, seConnecter } from "./outils";

// Sort des données en fin de pilote, SIMULATION (Jalon 14, étape 3 ; ADR 0086). Compte FICTIF ; chapitre du
// pilote ajouté ici puis retiré.
const ADMIN = "+999 000 029 01";
let ajoutes: string[] = [];

test.afterAll(async () => {
  await executerSql("delete from chapitres_pilote where chapitre_id = any($1::uuid[])", [ajoutes]);
  await executerSql("delete from periode_pilote");
});

test("la simulation montre durées et nombres par catégorie, sans rien effacer", async ({
  page,
}) => {
  await creerAdministrateurFictif(ADMIN);
  ajoutes = (
    await executerSql(
      `insert into chapitres_pilote (chapitre_id)
       select c.id from chapitres c join unites u on u.id = c.unite_id
       where u.code = 'ga-3e-mathematiques' order by c.ordre limit 1
       on conflict do nothing returning chapitre_id`,
    )
  ).map((r) => r.chapitre_id);
  await executerSql(
    `insert into periode_pilote (debut, fin, maj_par) values ('2026-10-01', '2026-10-31', 'test')
     on conflict (id) do update set debut = excluded.debut, fin = excluded.fin`,
  );
  const compter = async () =>
    (
      await executerSql(
        `select (select count(*) from echanges_professeur)::int as echanges,
                (select count(*) from profils)::int as profils,
                (select count(*) from signalements)::int as signalements`,
      )
    )[0];
  const avant = await compter();

  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await page.getByRole("link", { name: "Sort des données" }).click();
  await expect(page.getByText("Simulation seulement : rien n'est effacé ici.")).toBeVisible();
  await expect(page.getByText(/L'avis du juriste n'est pas encore coché/)).toBeVisible();
  const tableau = page.getByRole("list", { name: /Simulation du sort des données/ }).first();
  await expect(tableau.getByRole("listitem")).toHaveCount(7);
  const echanges = tableau
    .getByRole("listitem")
    .filter({ hasText: "Échanges avec le professeur IA" });
  await expect(echanges).toContainText("365 jours");
  await expect(echanges).toContainText("31 octobre 2027");
  await expect(
    tableau.getByRole("listitem").filter({ hasText: "Signalements traités" }),
  ).toContainText("Durée non fixée : rien n'est effacé");
  await expect(page.locator("main")).not.toContainText("+999");
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  expect.soft(resultat.violations.map((v) => `${v.id} : ${v.help}`)).toEqual([]);

  expect(await compter()).toEqual(avant);
});
