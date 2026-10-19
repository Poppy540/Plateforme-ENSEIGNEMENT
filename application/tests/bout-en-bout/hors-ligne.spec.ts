import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { inscrireEleveActif, seConnecter, validerChapitresFictifs } from "./outils";

// Connexions coupées (Jalon 5, étape 1 ; ADR 0044) : lecture hors ligne d'un chapitre déjà ouvert, question
// gardée puis envoyée au retour du réseau, tout effacé à la déconnexion ou au changement de personne.
test.describe.configure({ mode: "serial" });

const ELEVE_A = "+999 000 001 97";
const ELEVE_B = "+999 000 001 98";

async function attendreServiceWorker(page: Page) {
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
}

/** Coupure complète : la page et le service worker (le mode hors ligne seul ne coupe pas ce dernier). */
async function couperReseau(context: BrowserContext, coupe: boolean) {
  await context.setOffline(coupe);
  if (coupe) await context.route("**/*", (route) => route.abort("internetdisconnected"));
  else await context.unrouteAll();
}

const copies = (page: Page) =>
  page.evaluate(async () => (await caches.keys()).filter((n) => n.startsWith("chapitres-")));

test.beforeAll(async () => {
  await validerChapitresFictifs("ga-3e-mathematiques", 2);
});

test("chapitre lu hors ligne, question gardée puis envoyée, copies effacées à la déconnexion", async ({
  page,
  context,
}) => {
  await inscrireEleveActif(page, ELEVE_A, "3e");
  await page.goto("/catalogue/ga-3e-mathematiques");
  await attendreServiceWorker(page);
  await page.getByRole("link", { name: "Théorème de Thalès" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Théorème de Thalès");
  await page.getByLabel("Ta question").fill("Je ne comprends pas l'étape 2");
  await page.getByRole("button", { name: "Envoyer" }).click();
  // Réponse terminée (bouton de nouveau disponible) : l'échange est enregistré avant de recharger.
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeEnabled();
  await page.reload(); // la copie gardée (mise à jour en arrière-plan) contient l'échange
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const [nom] = (await caches.keys()).filter((n) => n.startsWith("chapitres-"));
        const copie = nom ? await (await caches.open(nom)).match(location.pathname) : undefined;
        return copie ? (await copie.text()).includes("étape 2") : false;
      }),
    )
    .toBe(true);

  await couperReseau(context, true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Théorème de Thalès");
  await expect(page.getByText("Tu es hors connexion")).toBeVisible();
  await expect(page.locator(".echange-eleve").first()).toContainText("l'étape 2");

  await page.getByLabel("Ta question").fill("Et la réciproque ?");
  await page.getByRole("button", { name: "Garder pour plus tard" }).click();
  await expect(page.locator(".en-attente")).toContainText("Et la réciproque ?");

  // Page jamais ouverte : page « Pas de connexion » avec les chapitres enregistrés.
  await page.goto("/catalogue");
  await expect(page.getByRole("heading", { name: "Pas de connexion" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Théorème de Thalès" })).toBeVisible();

  // Retour du réseau : la question en attente part seule.
  await couperReseau(context, false);
  await page.goto("/catalogue/ga-3e-mathematiques/thales");
  await expect(page.locator(".en-attente")).toHaveCount(0);
  await expect(page.locator(".echange-eleve").last()).toContainText("Et la réciproque ?");
  await expect(page.locator(".echange-professeur").last()).not.toBeEmpty();
  // La question quitte l'appareil une fois la réponse entièrement reçue.
  await expect
    .poll(() =>
      page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("plateforme:"))),
    )
    .toEqual([]);

  // Déconnexion : copies et questions effacées de l'appareil.
  await page.goto("/espace");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => copies(page)).toHaveLength(0);
});

test("une autre personne sur le même appareil ne voit jamais les copies de la précédente", async ({
  page,
  context,
}) => {
  await seConnecter(page, ELEVE_A);
  await page.goto("/catalogue/ga-3e-mathematiques");
  await attendreServiceWorker(page);
  await page.getByRole("link", { name: "Théorème de Thalès" }).click();
  await expect.poll(() => copies(page)).toHaveLength(1);
  const [copieA] = await copies(page);

  // Session expirée sans déconnexion, puis une autre élève se connecte.
  await context.clearCookies();
  await inscrireEleveActif(page, ELEVE_B, "3e");
  await page.goto("/espace");
  await expect.poll(() => copies(page)).not.toContain(copieA);

  await couperReseau(context, true);
  await page.goto("/catalogue/ga-3e-mathematiques/thales");
  await expect(page.getByRole("heading", { name: "Pas de connexion" })).toBeVisible();
  await expect(page.getByText("Aucun chapitre enregistré")).toBeVisible();
  await couperReseau(context, false);
});
