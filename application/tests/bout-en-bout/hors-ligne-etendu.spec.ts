import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { creerInvitationFictive, executerSql, inscrireEleveActif, seConnecter } from "./outils";

// Hors ligne étendu (Jalon 18, étape 4 ; décision D14, ADR 0101) : « Mes cours », chapitres d'une matière,
// plan de révision et correction d'un quiz déjà fait se relisent sans réseau, avec la date de la copie ; un quiz
// à faire n'est jamais gardé ; une copie de plus de 7 jours n'est plus servie. Données FICTIVES, chapitre de 5e
// que les autres tests n'utilisent pas.
test.describe.configure({ mode: "serial" });

const REFERENT = "+999 000 036 01";
const ELEVE = "+999 000 036 02";
const UNITE = "ga-5e-mathematiques";
const CHAPITRE = "proportionnalite-vitesse-echelle";
const QUIZ = `/catalogue/${UNITE}/${CHAPITRE}/quiz`;

async function attendreServiceWorker(page: Page) {
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
}

/** Coupure complète : la page et le service worker (le mode hors ligne seul ne coupe pas ce dernier). */
async function couperReseau(context: BrowserContext, coupe: boolean) {
  await context.setOffline(coupe);
  if (coupe) await context.route("**/*", (route) => route.abort("internetdisconnected"));
  else await context.unrouteAll();
}

/** Chemins gardés sur l'appareil pour la personne connectée. */
const gardes = (page: Page) =>
  page.evaluate(async () => {
    const chemins: string[] = [];
    for (const nom of (await caches.keys()).filter((n) => n.startsWith("chapitres-")))
      for (const r of await (await caches.open(nom)).keys()) chemins.push(new URL(r.url).pathname);
    return chemins.sort();
  });

test("le référent valide le chapitre et son quiz", async ({ page }) => {
  await creerInvitationFictive("TEST-HLET-0001", ["mathematiques"]);
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif hors ligne");
  await page.getByLabel("Code d'invitation").fill("TEST-HLET-0001");
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

test("mes cours, plan et correction se relisent hors ligne ; un quiz à faire n'est jamais gardé", async ({
  page,
  context,
}) => {
  await inscrireEleveActif(page, ELEVE, "5e");
  await page.goto("/catalogue");
  await attendreServiceWorker(page);
  await page.goto(`/catalogue/${UNITE}`);
  await page.goto("/espace/plan");
  // Quiz pas encore fait : la page n'est pas gardée.
  await page.goto(QUIZ);
  await expect(page.getByRole("button", { name: "Envoyer mes réponses" })).toBeVisible();
  await expect
    .poll(() => gardes(page))
    .toEqual(["/catalogue", `/catalogue/${UNITE}`, "/espace/plan"]);

  // Quiz fait : la correction est gardée.
  await page.getByLabel("4", { exact: true }).check();
  await page.getByLabel("Faux").check();
  await page.getByLabel("Ta réponse à la question 3").fill("3 × 4 = 12");
  await page.getByRole("button", { name: "Envoyer mes réponses" }).click();
  await expect(page.getByText(/Ton score : \d+ \/ 100 \(enregistré\)/)).toBeVisible();
  await page.goto(QUIZ);
  await expect.poll(() => gardes(page)).toContain(QUIZ);

  await couperReseau(context, true);
  for (const [chemin, titre] of [
    ["/catalogue", /Mes cours|Catalogue/],
    [`/catalogue/${UNITE}`, /Mathématiques/],
    ["/espace/plan", "Mon plan de révision"],
    [QUIZ, /^Quiz :/],
  ] as const) {
    const reponse = await page.goto(chemin);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(titre);
    // Revue du Jalon 24, S21 : la copie garde la politique de contenu de la page d'origine.
    expect(reponse?.headers()["content-security-policy"]).toMatch(/script-src/);
    await expect(page.getByRole("status").filter({ hasText: "hors connexion" })).toContainText(
      /copie enregistrée le \d+/,
    );
  }
  await expect(page.getByText(/Ton score : \d+ \/ 100/)).toBeVisible();
  await couperReseau(context, false);
});

test("une copie de plus de 7 jours n'est plus servie, et elle est effacée", async ({
  page,
  context,
}) => {
  await seConnecter(page, ELEVE);
  await page.goto("/espace/plan");
  await attendreServiceWorker(page);
  await expect.poll(() => gardes(page)).toContain("/espace/plan");
  // La copie du plan est vieillie de 8 jours (simulation de l'horloge).
  await page.evaluate(async () => {
    const huitJours = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    for (const nom of (await caches.keys()).filter((n) => n.startsWith("chapitres-"))) {
      const cache = await caches.open(nom);
      const copie = await cache.match("/espace/plan");
      if (!copie) continue;
      const entetes = new Headers(copie.headers);
      entetes.set("x-garde-le", huitJours);
      await cache.put("/espace/plan", new Response(await copie.text(), { headers: entetes }));
    }
  });
  await couperReseau(context, true);
  await page.goto("/espace/plan");
  await expect(page.getByRole("heading", { name: "Pas de connexion" })).toBeVisible();
  await couperReseau(context, false);
  await page.goto("/catalogue");
  expect(await gardes(page)).not.toContain("/espace/plan");
});
