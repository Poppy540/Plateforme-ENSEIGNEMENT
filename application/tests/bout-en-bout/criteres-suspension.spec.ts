import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { creerAdministrateurFictif, executerSql, seConnecter } from "./outils";

// Critères de suspension du pilote (Jalon 13, étape 1 ; ADR 0080). Compte, signalement et motifs FICTIFS ; seuils
// du pack pilote (chapitre du pilote désigné ici).
test.describe.configure({ mode: "serial" });

const ADMIN = "+999 000 023 01";
const RESUME = "Détresse fictive du test des critères";

async function auditer(page: Page, nom: string) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const violations = resultat.violations.map((v) => `${nom} — ${v.id} : ${v.help}`);
  expect.soft(violations, violations.join("\n")).toEqual([]);
}

const critere = (page: Page, code: string) => page.locator(`#critere-${code}`);
// Chapitres du pilote ajoutés par ce fichier seulement (retirés à la fin, les autres tests en dépendent).
let ajoutes: string[] = [];

test.afterAll(async () => {
  await executerSql(
    "delete from signalements where resume = $1 or resume like 'Critère de suspension du pilote : %'",
    [RESUME],
  );
  await executerSql("delete from alertes_criteres");
  await executerSql("delete from criteres_declares");
  await executerSql("delete from chapitres_pilote where chapitre_id = any($1::uuid[])", [ajoutes]);
});

test("une détresse non prise en charge depuis 13 h : critère atteint, une seule alerte", async ({
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
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await page.getByRole("link", { name: "Critères de suspension" }).click();
  await expect(
    page.getByRole("heading", { name: "Critères de suspension", level: 1 }),
  ).toBeVisible();
  await expect(critere(page, "detresse_hors_delai")).toContainText("Rien à signaler");
  // Budget de la semaine non fixé dans le pack : critère non surveillé, et c'est dit.
  await expect(critere(page, "depassement_budget")).toContainText("Non surveillé");
  await expect(critere(page, "depassement_budget")).toContainText("budget_hebdomadaire_usd");
  await auditer(page, "critères, au calme");

  await executerSql(
    `insert into signalements (source, motif, priorite, resume, cree_le)
     values ('agent_professeur', 'detresse', 1, $1, now() - interval '13 hours')`,
    [RESUME],
  );
  await page.reload();
  await expect(page.getByText("1 critère atteint")).toBeVisible();
  await expect(critere(page, "detresse_hors_delai")).toContainText("Atteint");
  await expect(critere(page, "detresse_hors_delai")).toContainText("plus de 12 h");
  await expect(critere(page, "detresse_hors_delai")).toContainText("À faire");

  // L'exécuteur planifié ajoute UNE alerte dans la file humaine, même appelé deux fois.
  for (let i = 0; i < 2; i++) {
    const reponse = await page.request.post("/api/orchestrateur/executer", {
      headers: { authorization: "Bearer jeton-de-test-uniquement-pas-un-secret-0000" },
    });
    expect(reponse.status()).toBe(200);
  }
  const [{ n }] = await executerSql(
    `select count(*)::int as n from signalements
     where resume like 'Critère de suspension du pilote : Détresse non prise en charge%' and eleve_id is null`,
  );
  expect(n).toBe(1);
  await auditer(page, "critères, détresse atteinte");
});

test("un critère se déclare avec un motif sans coordonnées, puis se lève", async ({ page }) => {
  await seConnecter(page, ADMIN);
  await page.goto("/administration/criteres");
  const equipe = critere(page, "equipe_indisponible");
  await equipe.getByText("Déclarer ce critère").click();
  await equipe.getByLabel(/Motif/).fill("Référent fictif absent, joignable au +999 77 12 34 56");
  await equipe.getByRole("button", { name: "Déclarer" }).click();
  await expect(page.getByRole("status")).toContainText("Critère déclaré");
  await expect(critere(page, "equipe_indisponible")).toContainText("À examiner");
  await expect(critere(page, "equipe_indisponible")).toContainText("[numéro masqué]");
  await expect(critere(page, "equipe_indisponible")).not.toContainText("+999");

  await critere(page, "equipe_indisponible").getByText("Mettre à jour ou lever").click();
  await critere(page, "equipe_indisponible")
    .getByLabel("Motif de la levée")
    .fill("Remplaçant fictif trouvé");
  await critere(page, "equipe_indisponible")
    .getByRole("button", { name: "Lever ce critère" })
    .click();
  await expect(page.getByRole("status")).toContainText("Critère levé");
  await expect(critere(page, "equipe_indisponible")).toContainText("Rien à signaler");
});
