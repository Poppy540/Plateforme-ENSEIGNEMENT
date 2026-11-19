import { expect, test } from "@playwright/test";
import {
  executerSql,
  identifiantSimule,
  inscrireEleveActif,
  validerChapitresFictifs,
} from "./outils";

// Mathématiques au lycée (Jalon 5, étape 4 ; ADR 0047) : un élève de Terminale D ne voit que les chapitres de
// sa série ; le Tuteur remonte jusqu'à la Seconde par un lien validé, jamais vers la série C.
test.describe.configure({ mode: "serial" });

const ELEVE_TLE_D = "+999 000 002 21";

async function idChapitre(unite: string, code: string): Promise<string> {
  const [c] = await executerSql(
    "select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 and c.code = $2",
    [unite, code],
  );
  return c.id;
}

test.beforeAll(async () => {
  for (const unite of [
    "ga-2nde-mathematiques",
    "ga-1re-c-mathematiques",
    "ga-1re-d-mathematiques",
    "ga-tle-c-mathematiques",
    "ga-tle-d-mathematiques",
  ])
    await validerChapitresFictifs(unite, 6);
  // Lien du pack validé (comme le ferait le référent) : Terminale D ← Seconde.
  await executerSql(
    `update prerequis_chapitres set statut = 'valide' where chapitre_id = $1 and prerequis_id = $2`,
    [
      await idChapitre("ga-tle-d-mathematiques", "probabilites-statistiques"),
      await idChapitre("ga-2nde-mathematiques", "statistiques-probabilites"),
    ],
  );
});

test("élève de Terminale D : chapitres de sa série, professeur de son unité, Tuteur jusqu'à la Seconde", async ({
  page,
}) => {
  await inscrireEleveActif(page, ELEVE_TLE_D, "Terminale", "D");
  await page.goto("/catalogue");
  await expect(page.locator('a[href="/catalogue/ga-tle-d-mathematiques"]')).toBeVisible();
  await expect(page.locator('a[href^="/catalogue/ga-tle-c-"]')).toHaveCount(0);
  await page.goto("/catalogue/ga-tle-d-mathematiques");
  await expect(page.locator(".chapitres li")).toHaveCount(2);
  await expect(page.getByText("Nombres complexes")).toHaveCount(0);

  await page.getByRole("link", { name: "Probabilités et statistiques" }).click();
  await page.getByLabel("Ta question").fill("Je ne comprends pas l'étape 2");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeEnabled();
  await expect(page.locator(".echange-professeur").last()).not.toBeEmpty();
  await expect(page.locator(".erreur")).toHaveCount(0);

  await executerSql(
    `insert into progression (eleve_id, chapitre_id, statut, score) values ($1, $2, 'en_cours', 20)
     on conflict (eleve_id, chapitre_id) do update set statut = 'en_cours', score = 20`,
    [
      identifiantSimule(ELEVE_TLE_D),
      await idChapitre("ga-tle-d-mathematiques", "probabilites-statistiques"),
    ],
  );
  await page.goto("/espace/plan");
  await page.getByRole("button", { name: "Mettre à jour mon plan" }).click();
  await expect(page.getByRole("heading", { name: /Ton plan/ })).toBeVisible();
  await expect(
    page.locator("section ol li").filter({ hasText: "Statistiques et probabilités" }),
  ).toBeVisible();
  // Rien de la série C : ni « Nombres complexes », ni « Géométrie dans l'espace ».
  await expect(page.locator("section ol li").filter({ hasText: /complexes|espace/ })).toHaveCount(
    0,
  );
});
