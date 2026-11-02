import { devices, expect, test, type Browser } from "@playwright/test";
import {
  creerAdministrateurFictif,
  creerInvitationFictive,
  executerSql,
  identifiantSimule,
  inscrireEleveActif,
  seConnecter,
} from "./outils";

// Journée d'ouverture de la classe pilote (Jalon 19, étape 3 ; ADR 0102), répétée avec des données FICTIVES :
// l'administration crée la classe (capacité 30), l'enseignant active son accès, le référent valide un chapitre et
// son quiz (un chapitre de 5e qu'aucun autre test ne cite : le niveau importe peu, ce sont les gestes qui comptent), puis 30 élèves s'inscrivent (accord du parent), rejoignent la classe, ouvrent le chapitre et font le
// quiz, 6 à la fois ; un 31e trouve la classe pleine. L'enseignant voit ses chiffres d'ensemble, l'administration
// suit la journée. Les élèves sont effacés à la fin.
test.describe.configure({ mode: "serial" });

const ADMIN = "+999 000 039 90";
const ENSEIGNANT = "+999 000 039 91";
const REFERENT = "+999 000 039 92";
const NOM = "5e pilote (répétition)";
const UNITE = "ga-5e-mathematiques";
const CHAPITRE = "statistiques-moyenne";
const TITRE = "Statistiques : moyenne";
const ELEVES = Array.from(
  { length: 30 },
  (_, i) => `+999 000 039 ${String(i + 1).padStart(2, "0")}`,
);
const EN_TROP = "+999 000 039 31";
const PAR_VAGUE = 6;
const codes: { classe?: string; enseignant?: string } = {};
const durees: number[] = [];

test.afterAll(async () => {
  // Rien de cette journée ne doit compter dans les autres tests.
  await executerSql("delete from auth.users where id = any($1::uuid[])", [
    [...ELEVES, EN_TROP].map(identifiantSimule),
  ]);
});

test("la veille : classe créée (capacité 30), enseignant activé, chapitre et quiz validés", async ({
  page,
}) => {
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  await page.goto("/administration/classes");
  const section = page.getByRole("region", { name: /référentiel ga-general/ });
  await section.getByLabel("Niveau").selectOption({ label: "5e" });
  await section.getByLabel(/Nom de la classe/).fill(NOM);
  await section.getByLabel("Établissement").fill("Collège fictif");
  await section.getByLabel(/Capacité de la classe/).fill("30");
  await section.getByRole("button", { name: "Créer la classe" }).click();
  const affiches = section.locator(".code");
  await expect(affiches).toHaveCount(2);
  [codes.classe, codes.enseignant] = (await affiches.allTextContents()).map((t) => t.trim());

  await page.context().clearCookies();
  await seConnecter(page, ENSEIGNANT);
  await page.goto("/enseignant/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Enseignant fictif");
  await page.getByLabel("Code d'invitation").fill(codes.enseignant!);
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/enseignant$/);
  await expect(page.getByRole("status")).toContainText("dès que 5 élèves au moins");

  await page.context().clearCookies();
  await creerInvitationFictive("TEST-JOUR-0001", ["mathematiques"]);
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif");
  await page.getByLabel("Code d'invitation").fill("TEST-JOUR-0001");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  const [{ id }] = await executerSql(
    `select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 and c.code = $2`,
    [UNITE, CHAPITRE],
  );
  await page.goto(`/referent/chapitres/${id}`);
  await page.getByLabel(/Commentaire/).fill("Relu (fictif).");
  await page.getByRole("button", { name: /Valider la version 1/ }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await page.goto(`/referent/chapitres/${id}`);
  await page.getByLabel("Nombre de questions").fill("3");
  await page.getByRole("button", { name: "Générer un quiz brouillon" }).click();
  await expect(page.getByRole("status")).toContainText("Quiz version 1 créé");
  const [{ id: quiz }] = await executerSql("select id from quiz where chapitre_id = $1", [id]);
  await page.goto(`/referent/quiz/${quiz}`);
  await page.getByLabel(/J'ai vérifié les points/).check();
  await page.getByRole("button", { name: "Valider la version 1" }).click();
  await expect(page.getByText("Statut : Validé")).toBeVisible();
});

/** Un élève, du premier SMS au quiz : inscription, accord du parent, code de classe, chapitre, quiz. */
async function parcoursEleve(browser: Browser, numero: string) {
  const debut = Date.now();
  const contexte = await browser.newContext({
    ...devices["Pixel 7"],
    baseURL: "http://localhost:3100",
  });
  const page = await contexte.newPage();
  await inscrireEleveActif(page, numero, "5e");
  await page.goto("/espace");
  await page.getByLabel(/Code de ta classe/).fill(codes.classe!);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.getByText(`Tu fais partie de la classe ${NOM}`)).toBeVisible();
  await page.goto(`/catalogue/${UNITE}`);
  await page.getByRole("link", { name: TITRE }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITRE);
  await page.getByRole("link", { name: "Faire le quiz du chapitre" }).click();
  await page.getByLabel("4", { exact: true }).check();
  await page.getByLabel("Faux").check();
  await page.getByLabel("Ta réponse à la question 3").fill("3 × 4 = 12");
  await page.getByRole("button", { name: "Envoyer mes réponses" }).click();
  await expect(page.getByText(/Ton score : \d+ \/ 100 \(enregistré\)/)).toBeVisible({
    timeout: 20_000,
  });
  await contexte.close();
  durees.push(Date.now() - debut);
}

test("le jour J : 30 élèves rejoignent la classe et font le premier quiz, 6 à la fois", async ({
  browser,
}) => {
  test.setTimeout(10 * 60_000);
  const debut = Date.now();
  for (let i = 0; i < ELEVES.length; i += PAR_VAGUE)
    await Promise.all(ELEVES.slice(i, i + PAR_VAGUE).map((n) => parcoursEleve(browser, n)));
  const tries = [...durees].sort((a, b) => a - b);
  console.log(
    `Journée d'ouverture : ${ELEVES.length} élèves en ${Math.round((Date.now() - debut) / 1000)} s ; ` +
      `par élève, médiane ${(tries[Math.floor(tries.length / 2)] / 1000).toFixed(1)} s, ` +
      `maximum ${(tries.at(-1)! / 1000).toFixed(1)} s.`,
  );

  const [compte] = await executerSql(
    `select (select count(*) from eleves e join classes c on c.id = e.classe_id where c.nom = $1)::int as membres,
            (select count(*) from tentatives_quiz t join quiz q on q.id = t.quiz_id
               join chapitres ch on ch.id = q.chapitre_id where ch.code = $2)::int as tentatives`,
    [NOM, CHAPITRE],
  );
  expect(compte).toEqual({ membres: 30, tentatives: 30 });
});

test("un 31e élève trouve la classe pleine ; l'administration est alertée", async ({ page }) => {
  await inscrireEleveActif(page, EN_TROP, "5e");
  await page.goto("/espace");
  await page.getByLabel(/Code de ta classe/).fill(codes.classe!);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.locator(".erreur")).toContainText("Cette classe est complète");

  await page.context().clearCookies();
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await expect(page.locator("main")).toContainText(`Classe « ${NOM} » (Collège fictif) complète`);
});

test("le soir : l'enseignant voit les chiffres d'ensemble de sa classe, sans aucun nom", async ({
  page,
}) => {
  await seConnecter(page, ENSEIGNANT);
  await expect(page.getByText("Élèves inscrits dans la classe : 30")).toBeVisible();
  const carte = page
    .getByRole("list", { name: `Avancement de la classe ${NOM}` })
    .getByRole("listitem")
    .filter({ hasText: TITRE });
  await expect(carte).toBeVisible();
  // Décision D15 a : le quiz passé suffit pour que le chapitre compte comme « commencé ».
  const chiffres = carte.getByRole("definition");
  await expect(chiffres.nth(0)).toHaveText("30"); // Commencé
  await expect(chiffres.nth(2)).toHaveText("30"); // Quiz passé
  await expect(page.locator("main")).not.toContainText("Élève fictif");
  await expect(page.locator("main")).not.toContainText("+999");
});
