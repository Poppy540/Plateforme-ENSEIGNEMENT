import { expect, test, type Page } from "@playwright/test";
import { creerInvitationFictive, executerSql, seConnecter } from "../bout-en-bout/outils";

// Captures du kit de démarrage du référent (Jalon 19, étape 2), sur téléphone simulé, données FICTIVES : les
// vrais écrans, dans l'ordre où le référent les rencontre. Agents simulés ; rien n'est envoyé.
// Régénérer : pnpm demo:captures tests/demo/kit-referent.spec.ts
const DOSSIER = process.env.DOSSIER_CAPTURES_REFERENT ?? "../docs/pilote/kit-referent/captures";
let numero = 0;
async function capture(page: Page, nom: string, pleinePage = false) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: pleinePage,
  });
}

test.use({ locale: "fr-FR" });

const REFERENT = "+999 000 038 01";
const UNITE = "ga-3e-mathematiques";

test("parcours du référent pour le kit de démarrage", async ({ page }) => {
  test.setTimeout(240_000);
  // Chapitres du pilote : les trois premiers de Mathématiques 3e (choix de l'administration, ici en base).
  const chapitres = await executerSql(
    `select c.id, c.titre from chapitres c join unites u on u.id = c.unite_id
     where u.code = $1 order by c.ordre limit 3`,
    [UNITE],
  );
  await executerSql(
    "insert into chapitres_pilote (chapitre_id) select unnest($1::uuid[]) on conflict do nothing",
    [chapitres.map((c) => c.id)],
  );
  await creerInvitationFictive("TEST-KITR-0001", ["mathematiques"]);

  // 1. Activation avec le code d'invitation.
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Mme Exemple");
  await page.getByLabel("Code d'invitation").fill("TEST-KITR-0001");
  await capture(page, "activation");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);

  // 2. Accueil, puis espace : chapitres du pilote en tête, avec la prochaine action.
  await page.goto("/referent/accueil");
  await capture(page, "accueil", true);
  await page.goto("/referent");
  await expect(page.getByRole("heading", { name: /Chapitres du pilote/ })).toBeVisible();
  await capture(page, "espace-chapitres-du-pilote");

  // 3. Chapitre à relire : lire, puis valider ou rejeter avec un commentaire.
  const [premier, deuxieme] = chapitres;
  await page.goto(`/referent/chapitres/${premier.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(premier.titre);
  await capture(page, "chapitre-a-relire", true);
  await page.goto(`/referent/chapitres/${deuxieme.id}`);
  await page.getByRole("button", { name: "Rejeter", exact: true }).click();
  await expect(page.locator(".erreur").first()).toBeVisible();
  await page.locator(".erreur").first().scrollIntoViewIfNeeded();
  await capture(page, "rejet-sans-commentaire-refuse");

  await page.goto(`/referent/chapitres/${premier.id}`);
  await page.getByLabel(/Commentaire/).fill("Conforme au programme ; exemples adaptés.");
  await page.getByRole("button", { name: /Valider la version 1/ }).click();
  await expect(page).toHaveURL(/\/referent$/);

  // 4. Chapitre validé : brouillons de quiz et de script, préparés par les agents (simulés ici).
  await page.goto(`/referent/chapitres/${premier.id}`);
  await page.getByLabel("Nombre de questions").fill("3");
  await page.getByRole("button", { name: "Générer un quiz brouillon" }).click();
  await expect(page.getByRole("status")).toContainText("Quiz version 1 créé");
  await page.getByLabel(/Durée cible/).fill("8");
  await page.getByRole("button", { name: "Générer un brouillon de script" }).click();
  await expect(page.getByText("Brouillon version 1 créé")).toBeVisible();
  await page.getByRole("heading", { name: "Scripts de cours vidéo" }).scrollIntoViewIfNeeded();
  await capture(page, "brouillons-demandes");

  const [{ id: quiz }] = await executerSql("select id from quiz where chapitre_id = $1", [
    premier.id,
  ]);
  await page.goto(`/referent/quiz/${quiz}`);
  await capture(page, "quiz-a-relire", true);

  const [{ id: script }] = await executerSql("select id from scripts where chapitre_id = $1", [
    premier.id,
  ]);
  await page.goto(`/referent/scripts/${script}`);
  await expect(page.locator("mark").first()).toHaveText("[À VÉRIFIER]");
  await page.locator("mark").first().scrollIntoViewIfNeeded();
  await capture(page, "script-points-a-verifier");

  // 5. Liens de prérequis, puis « Mes données ».
  await page.goto("/referent/prerequis");
  await capture(page, "liens-de-prerequis");
  await page.goto("/espace/mes-donnees");
  await capture(page, "mes-donnees");
});
