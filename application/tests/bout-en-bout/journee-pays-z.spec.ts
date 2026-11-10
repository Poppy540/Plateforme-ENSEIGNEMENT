import { devices, expect, test, type Browser, type BrowserContext } from "@playwright/test";
import {
  creerAdministrateurFictif,
  creerInvitationFictive,
  executerSql,
  identifiantSimule,
  inscrireEleveActif,
  seConnecter,
} from "./outils";

// Journée d'ouverture rejouée pour le pays FICTIF Z (Jalon 22, étape 2 ; ADR 0112) : mêmes gestes que pour le
// pilote (journee-ouverture.spec.ts), avec la structure du pack zz-fictif (« Années », « options », majorité à
// 16 ans), sans une ligne de code propre à ce pays. Puis l'étanchéité : un compte du Gabon ne voit rien du pays Z,
// et l'inverse. Le chapitre « Proportions et échelles (pays Z) » n'est cité par aucun autre test. Élèves effacés à la fin.
test.describe.configure({ mode: "serial" });

const ADMIN = "+999 000 040 90";
const ENSEIGNANT = "+999 000 040 91";
const REFERENT = "+999 000 040 92";
const ELEVE_GABON = "+999 000 040 93";
const REFERENTIEL = "zz-general";
const NOM = "Année 2 B (pays Z, répétition)";
const UNITE = "zz-an2-mathematiques";
const CHAPITRE = "proportions";
const TITRE = "Proportions et échelles (pays Z)";
const ELEVES = Array.from(
  { length: 10 },
  (_, i) => `+999 000 040 ${String(i + 1).padStart(2, "0")}`,
);
const EN_TROP = "+999 000 040 11";
const PAR_VAGUE = 5;
const codes: { classe?: string; enseignant?: string } = {};

test.afterAll(async () => {
  await executerSql("delete from auth.users where id = any($1::uuid[])", [
    [...ELEVES, EN_TROP, ELEVE_GABON].map(identifiantSimule),
  ]);
});

/** Coupure complète : la page et le service worker. */
async function couperReseau(context: BrowserContext, coupe: boolean) {
  await context.setOffline(coupe);
  if (coupe) await context.route("**/*", (route) => route.abort("internetdisconnected"));
  else await context.unrouteAll();
}

test("la veille : classe d'« Année 2 » (capacité 10), enseignant, référent du pays Z, chapitre et quiz validés", async ({
  page,
}) => {
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  await page.goto("/administration/classes");
  // Chaque pays a son formulaire, avec ses classes et son mot pour les séries (ADR 0111).
  const pilote = page.getByRole("region", { name: /référentiel ga-general/ });
  await expect(pilote.getByLabel("Série (facultatif)")).toBeVisible();
  const section = page.getByRole("region", { name: new RegExp(`référentiel ${REFERENTIEL}`) });
  await expect(section.getByLabel("Option (facultatif)")).toBeVisible();
  await expect(section.getByLabel(/Nom de la classe/)).toHaveAccessibleName(/« Année 1 A »/);
  const niveaux = await section.getByLabel("Niveau").locator("option").allTextContents();
  expect(niveaux).toEqual(["Année 1", "Année 2", "Année 3", "Année 4"]);
  await section.getByLabel("Niveau").selectOption({ label: "Année 2" });
  await section.getByLabel(/Nom de la classe/).fill(NOM);
  await section.getByLabel("Établissement").fill("École fictive du pays Z");
  await section.getByLabel(/Capacité de la classe/).fill(String(ELEVES.length));
  await section.getByRole("button", { name: "Créer la classe" }).click();
  const affiches = section.locator(".code");
  await expect(affiches).toHaveCount(2);
  [codes.classe, codes.enseignant] = (await affiches.allTextContents()).map((t) => t.trim());
  await page.reload();
  await expect(page.locator(".carte").filter({ hasText: NOM })).toContainText(
    `${REFERENTIEL}, Année 2`,
  );

  await page.context().clearCookies();
  await seConnecter(page, ENSEIGNANT);
  await page.goto("/enseignant/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Enseignant fictif Z");
  await page.getByLabel("Code d'invitation").fill(codes.enseignant!);
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/enseignant$/);
  await expect(page.getByText("Niveau : Année 2")).toBeVisible();

  await page.context().clearCookies();
  await creerInvitationFictive("TEST-JOUZ-0001", ["mathematiques"], REFERENTIEL);
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif Z");
  await page.getByLabel("Code d'invitation").fill("TEST-JOUZ-0001");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  // Le référent du pays Z ne voit que les chapitres de son pays.
  await expect(page.locator("main")).toContainText(TITRE);
  await expect(page.locator("main")).not.toContainText("Thalès");
  const [{ id }] = await executerSql(
    `select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 and c.code = $2`,
    [UNITE, CHAPITRE],
  );
  await page.goto(`/referent/chapitres/${id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITRE);
  await page.getByLabel(/Commentaire/).fill("Relu (fictif, pays Z).");
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

  // Un chapitre du Gabon lui est fermé.
  const [{ id: chapitreGabon }] = await executerSql(
    `select c.id from chapitres c join unites u on u.id = c.unite_id
     where u.code = 'ga-3e-mathematiques' order by c.ordre limit 1`,
  );
  const fermee = await page.goto(`/referent/chapitres/${chapitreGabon}`);
  expect(fermee?.status()).toBe(404);
});

/** Un élève mineur du pays Z : inscription, accord du parent, code de classe, chapitre, quiz. */
async function parcoursEleve(browser: Browser, numero: string) {
  const contexte = await browser.newContext({
    ...devices["Pixel 7"],
    baseURL: "http://localhost:3100",
  });
  const page = await contexte.newPage();
  await inscrireEleveActif(page, numero, "Année 2", undefined, REFERENTIEL);
  await page.goto("/espace");
  await expect(page.getByText("Classe : Année 2")).toBeVisible();
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
}

test("le jour J : 10 élèves du pays Z rejoignent la classe et font le quiz, 5 à la fois", async ({
  browser,
}) => {
  test.setTimeout(5 * 60_000);
  for (let i = 0; i < ELEVES.length; i += PAR_VAGUE)
    await Promise.all(ELEVES.slice(i, i + PAR_VAGUE).map((n) => parcoursEleve(browser, n)));
  const [compte] = await executerSql(
    `select (select count(*) from eleves e join classes c on c.id = e.classe_id where c.nom = $1)::int as membres,
            (select count(*) from tentatives_quiz t join quiz q on q.id = t.quiz_id
               join chapitres ch on ch.id = q.chapitre_id where ch.code = $2)::int as tentatives`,
    [NOM, CHAPITRE],
  );
  expect(compte).toEqual({ membres: ELEVES.length, tentatives: ELEVES.length });
});

test("un 11e élève trouve la classe pleine ; l'administration est alertée et suit le pilote", async ({
  page,
}) => {
  await inscrireEleveActif(page, EN_TROP, "Année 2", undefined, REFERENTIEL);
  await page.goto("/espace");
  await page.getByLabel(/Code de ta classe/).fill(codes.classe!);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.locator(".erreur")).toContainText("Cette classe est complète");

  await page.context().clearCookies();
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await expect(page.locator("main")).toContainText(
    `Classe « ${NOM} » (École fictive du pays Z) complète`,
  );
  await page.goto("/administration/tableau-de-bord");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".erreur")).toHaveCount(0);
});

test("un élève du pays Z relit son cours et son plan sans réseau", async ({ page, context }) => {
  await seConnecter(page, ELEVES[0]);
  await page.goto("/catalogue");
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  await page.goto(`/catalogue/${UNITE}`);
  await page.goto("/espace/plan");
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const chemins: string[] = [];
        for (const nom of (await caches.keys()).filter((n) => n.startsWith("chapitres-")))
          for (const r of await (await caches.open(nom)).keys())
            chemins.push(new URL(r.url).pathname);
        return chemins.sort();
      }),
    )
    .toEqual(["/catalogue", `/catalogue/${UNITE}`, "/espace/plan"]);

  await couperReseau(context, true);
  for (const [chemin, titre] of [
    ["/catalogue", "Mes cours — Année 2"],
    [`/catalogue/${UNITE}`, /Mathématiques/],
    ["/espace/plan", "Mon plan de révision"],
  ] as const) {
    await page.goto(chemin);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(titre);
    await expect(page.getByRole("status").filter({ hasText: "hors connexion" })).toContainText(
      /copie enregistrée le \d+/,
    );
  }
  await couperReseau(context, false);
});

test("le soir : l'enseignant du pays Z voit les chiffres d'ensemble, sans aucun nom", async ({
  page,
}) => {
  await seConnecter(page, ENSEIGNANT);
  await expect(page.getByText(`Élèves inscrits dans la classe : ${ELEVES.length}`)).toBeVisible();
  const carte = page
    .getByRole("list", { name: `Avancement de la classe ${NOM}` })
    .getByRole("listitem")
    .filter({ hasText: TITRE });
  const chiffres = carte.getByRole("definition");
  await expect(chiffres.nth(0)).toHaveText(String(ELEVES.length)); // Commencé
  await expect(chiffres.nth(2)).toHaveText(String(ELEVES.length)); // Quiz passé
  await expect(page.locator("main")).not.toContainText("Élève fictif");
  await expect(page.locator("main")).not.toContainText("+999");
});

test("étanchéité : chaque élève ne voit que les classes et les cours de son pays", async ({
  page,
}) => {
  await inscrireEleveActif(page, ELEVE_GABON, "3e");
  await page.goto("/espace");
  await page.getByLabel(/Code de ta classe/).fill(codes.classe!);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.locator(".erreur")).toContainText(
    "Ce code correspond à une autre classe que la tienne.",
  );
  await page.goto("/catalogue");
  await expect(page.locator("main")).not.toContainText("pays Z");
  const reponse = await page.goto(`/catalogue/${UNITE}`);
  expect(reponse?.status()).toBe(404);
  await page.goto("/aide");
  await expect(page.getByText("Quelle option choisir en Année 4 ?")).toHaveCount(0);

  // Et l'inverse : un élève du pays Z n'ouvre pas une unité du Gabon.
  await page.context().clearCookies();
  await seConnecter(page, ELEVES[0]);
  const gabon = await page.goto("/catalogue/ga-3e-mathematiques");
  expect(gabon?.status()).toBe(404);
});
