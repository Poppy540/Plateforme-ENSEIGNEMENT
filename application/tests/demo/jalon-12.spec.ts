import { expect, test, type Page } from "@playwright/test";
import { classeEnSql, empreinteCode } from "../../src/lib/invitation";
import {
  creerAdministrateurFictif,
  executerSql,
  seConnecter,
  validerChapitresFictifs,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 12, sur téléphone simulé, données FICTIVES : tableau des 12 conditions du
// pilote, d'abord vide, puis conditions vérifiées par la plateforme et conditions cochées avec une preuve.
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_12 ?? "../docs/demo/jalon-12";
let numero = 0;
async function capture(page: Page, nom: string, pleinePage = true) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: pleinePage,
  });
}

// Navigateur en français, comme celui des utilisateurs.
test.use({ locale: "fr-FR" });

const ADMIN = "+999 000 022 01";
const UNITE = "ga-3e-mathematiques";
const condition = (page: Page, n: number) => page.locator(`#condition-${n}`);

async function cocher(page: Page, n: number, preuve: string, date: string) {
  await condition(page, n).getByText("Cocher avec une preuve").click();
  await condition(page, n)
    .getByLabel(/Preuve/)
    .fill(preuve);
  await condition(page, n).getByLabel("Date de la preuve").fill(date);
  await condition(page, n)
    .getByRole("button", { name: `Cocher la condition ${n}` })
    .click();
  await expect(page.getByRole("status")).toContainText(`Condition ${n} cochée`);
}

test("parcours complet du Jalon 12", async ({ page }) => {
  test.setTimeout(240_000);
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);

  // 1. Au départ : aucune condition remplie.
  await page.goto("/administration/conditions");
  await expect(page.getByText("0 / 12 conditions remplies")).toBeVisible();
  await capture(page, "conditions-au-depart", false);

  // 2. Données FICTIVES : 3 chapitres du pilote prêts (chapitre, script et quiz validés), un référent de la
  //    matière, une classe du pilote.
  await validerChapitresFictifs(UNITE, 3);
  await executerSql(
    `with choisis as (
       select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 order by c.ordre limit 3
     ), pilote as (
       insert into chapitres_pilote (chapitre_id) select id from choisis
     ), scripts_crees as (
       insert into scripts (chapitre_id, version, contenu, duree_cible_minutes, cree_par)
       select id, 1, '{"sections": []}'::jsonb, 8, 'demonstration' from choisis
     )
     insert into quiz (chapitre_id, version, questions, cree_par)
     select id, 1, '[{"enonce": "Question fictive"}]'::jsonb, 'demonstration' from choisis`,
    [UNITE],
  );
  // Validation simulée, comme dans les autres démonstrations (en vrai : par le référent, dans son espace).
  for (const table of ["scripts", "quiz"])
    await executerSql(
      `update ${table} set statut = 'valide' where chapitre_id in (select chapitre_id from chapitres_pilote)`,
    );
  await executerSql(
    `insert into referents_familles (referent_id, referentiel_id, famille)
     select '99999999-9999-4999-8999-999999999999', id, 'mathematiques' from referentiels where code = 'ga-general'
     on conflict do nothing`,
  );
  await executerSql(
    classeEnSql({
      referentiel: "ga-general",
      niveau: "3e",
      serie: null,
      nom: "3e C (fictive)",
      etablissement: "Collège fictif de démonstration",
      empreinteClasse: empreinteCode("DEMO-CLAS-0012"),
      empreinteEnseignant: empreinteCode("DEMO-ENSE-0012"),
      joursCodeClasse: 30,
      joursInvitation: 1,
    }),
  );
  await page.reload();
  await expect(condition(page, 3)).toContainText("Remplie");
  await expect(condition(page, 4)).toContainText("Remplie");
  await condition(page, 3).evaluate((e) => e.scrollIntoView({ block: "start" }));
  await capture(page, "conditions-3-et-4-verifiees-par-la-plateforme", false);

  // 3. Le propriétaire coche une condition avec sa preuve (les coordonnées seront masquées).
  await condition(page, 1).getByText("Cocher avec une preuve").click();
  await condition(page, 1)
    .getByLabel(/Preuve/)
    .fill("Avis écrit fictif du juriste, reçu par courrier ; contact +999 77 12 34 56");
  await condition(page, 1).getByLabel("Date de la preuve").fill("2026-10-20");
  await condition(page, 1).evaluate((e) => e.scrollIntoView({ block: "start" }));
  await capture(page, "cocher-avec-une-preuve", false);
  await condition(page, 1).getByRole("button", { name: "Cocher la condition 1" }).click();
  await expect(page.getByRole("status")).toContainText("Condition 1 cochée");
  await expect(condition(page, 1)).toContainText("[numéro masqué]");

  // 4. Une condition mixte, cochée, reste « à revoir » tant que la configuration du serveur n'est pas prête.
  await cocher(page, 2, "Convention fictive signée avec le collège", "2026-10-22");
  await cocher(page, 6, "Restauration fictive essayée le jour même", "2026-10-25");
  await cocher(page, 9, "Équipe de veille fictive nommée, contacts remplis", "2026-10-26");
  await expect(condition(page, 6)).toContainText("À revoir");
  await condition(page, 6).evaluate((e) => e.scrollIntoView({ block: "start" }));
  await capture(page, "condition-mixte-a-revoir", false);

  // 5. Vue d'ensemble : le décompte et toutes les conditions.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByText("5 / 12 conditions remplies")).toBeVisible();
  await capture(page, "tableau-des-conditions");
});
