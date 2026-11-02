import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  creerInvitationFictive,
  executerSql,
  inscrireEleveActif,
  seConnecter,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 18, sur téléphone simulé, données FICTIVES : lecture sans réseau étendue
// (décision D14, ADR 0101) — « Mes cours », chapitres d'une matière, plan de révision et correction d'un quiz
// relus sans réseau, avec la date de la copie ; une page non gardée mène à « Pas de connexion ».
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_18 ?? "../docs/demo/jalon-18";
let numero = 0;
async function capture(page: Page, nom: string, pleinePage = false) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: pleinePage,
  });
}

test.use({ locale: "fr-FR" });

const REFERENT = "+999 000 037 01";
const ELEVE = "+999 000 037 02";
const UNITE = "ga-5e-mathematiques";
const CHAPITRE = "proportionnalite-vitesse-echelle";
const QUIZ = `/catalogue/${UNITE}/${CHAPITRE}/quiz`;

async function couperReseau(context: BrowserContext, coupe: boolean) {
  await context.setOffline(coupe);
  if (coupe) await context.route("**/*", (route) => route.abort("internetdisconnected"));
  else await context.unrouteAll();
}

test("parcours complet du Jalon 18", async ({ page, context }) => {
  test.setTimeout(240_000);
  // Chapitre et quiz validés par un référent fictif.
  await creerInvitationFictive("TEST-DEMO-0018", ["mathematiques"]);
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif");
  await page.getByLabel("Code d'invitation").fill("TEST-DEMO-0018");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  const [{ id }] = await executerSql(
    `select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 and c.code = $2`,
    [UNITE, CHAPITRE],
  );
  await page.goto(`/referent/chapitres/${id}`);
  await page.getByLabel(/Commentaire/).fill("Relu (fictif).");
  await page.getByRole("button", { name: /Valider la version 1/ }).click();
  await page.goto(`/referent/chapitres/${id}`);
  await page.getByLabel("Nombre de questions").fill("3");
  await page.getByRole("button", { name: "Générer un quiz brouillon" }).click();
  await expect(page.getByRole("status")).toContainText("Quiz version 1 créé");
  const [{ id: quiz }] = await executerSql("select id from quiz where chapitre_id = $1", [id]);
  await page.goto(`/referent/quiz/${quiz}`);
  await page.getByLabel(/J'ai vérifié les points/).check();
  await page.getByRole("button", { name: "Valider la version 1" }).click();
  await expect(page.getByText("Statut : Validé")).toBeVisible();
  await page.context().clearCookies();

  // L'élève suit son parcours en ligne : cours, quiz, plan.
  await inscrireEleveActif(page, ELEVE, "5e");
  await page.goto("/catalogue");
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  await page.goto(`/catalogue/${UNITE}`);
  await page.goto(QUIZ);
  await page.getByLabel("4", { exact: true }).check();
  await page.getByLabel("Faux").check();
  await page.getByLabel("Ta réponse à la question 3").fill("3 × 4 = 12");
  await page.getByRole("button", { name: "Envoyer mes réponses" }).click();
  await expect(page.getByText(/Ton score : \d+ \/ 100 \(enregistré\)/)).toBeVisible();
  await page.goto(QUIZ);
  await page.goto("/espace/plan");
  await page.getByRole("button", { name: "Mettre à jour mon plan" }).click();
  await expect(page.getByRole("heading", { name: /Ton plan/ })).toBeVisible();
  await page.goto("/espace/plan");
  await expect
    .poll(() =>
      page.evaluate(async () => {
        let n = 0;
        for (const nom of (await caches.keys()).filter((x) => x.startsWith("chapitres-")))
          n += (await (await caches.open(nom)).keys()).length;
        return n;
      }),
    )
    .toBe(4);

  // Plus de réseau : les pages déjà ouvertes se relisent, avec la date de la copie.
  await couperReseau(context, true);
  const bandeau = page.getByRole("status").filter({ hasText: "hors connexion" });
  await page.goto("/catalogue");
  await expect(bandeau).toContainText("copie enregistrée le");
  await capture(page, "mes-cours-hors-ligne");
  await page.goto(`/catalogue/${UNITE}`);
  await expect(bandeau).toBeVisible();
  await capture(page, "chapitres-matiere-hors-ligne");
  await page.goto("/espace/plan");
  await expect(bandeau).toBeVisible();
  await capture(page, "plan-hors-ligne");
  await page.goto(QUIZ);
  await expect(page.getByText(/Ton score : \d+ \/ 100/)).toBeVisible();
  await capture(page, "correction-quiz-hors-ligne");
  // Page jamais ouverte : « Pas de connexion », avec la liste des pages gardées.
  await page.goto("/espace/mes-donnees");
  await expect(page.getByRole("heading", { name: "Pas de connexion" })).toBeVisible();
  await expect(page.locator(".chapitres-gardes li")).toHaveCount(4);
  await capture(page, "pas-de-connexion-pages-gardees", true);
  await couperReseau(context, false);
});
