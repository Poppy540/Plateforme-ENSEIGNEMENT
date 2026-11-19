import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  creerAdministrateurFictif,
  executerSql,
  identifiantSimule,
  inscrireEleveActif,
  seConnecter,
  validerChapitresFictifs,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 5 (modèles et messagerie simulés), sur téléphone simulé, données fictives :
// accord parental imposé, lecture hors ligne, question gardée, Mathématiques au lycée, pilotage de l'exploitation.
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_5 ?? "../docs/demo/jalon-5";
let numero = 0;
async function capture(page: Page, nom: string) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: true,
  });
}

const ELEVE = "+999 000 000 91";
const ELEVE_TLE_D = "+999 000 000 92";
const ADMIN = "+999 000 000 93";

async function couperReseau(context: BrowserContext, coupe: boolean) {
  await context.setOffline(coupe);
  if (coupe) await context.route("**/*", (route) => route.abort("internetdisconnected"));
  else await context.unrouteAll();
}

async function idChapitre(unite: string, code: string): Promise<string> {
  const [c] = await executerSql(
    "select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 and c.code = $2",
    [unite, code],
  );
  return c.id;
}

test("parcours complet du Jalon 5", async ({ page, context }) => {
  test.setTimeout(240_000);
  await validerChapitresFictifs("ga-3e-mathematiques", 3);
  for (const unite of ["ga-2nde-mathematiques", "ga-tle-d-mathematiques"])
    await validerChapitresFictifs(unite, 6);
  await executerSql(
    "update prerequis_chapitres set statut = 'valide' where chapitre_id = $1 and prerequis_id = $2",
    [
      await idChapitre("ga-tle-d-mathematiques", "probabilites-statistiques"),
      await idChapitre("ga-2nde-mathematiques", "statistiques-probabilites"),
    ],
  );

  // 1. Inscription au Gabon : l'âge de la majorité n'est pas fixé, l'accord d'un parent est toujours demandé.
  await seConnecter(page, ELEVE);
  await page.getByLabel("Ton prénom ou un pseudonyme").fill("Élève fictif");
  await page.getByLabel("Ta classe").selectOption({ label: "3e" });
  await capture(page, "inscription-accord-parental-impose");
  await page.context().clearCookies();
  await inscrireEleveActif(page, ELEVE, "3e");

  // 2. Lecture hors ligne d'un chapitre déjà ouvert, question gardée pour plus tard.
  await page.goto("/catalogue/ga-3e-mathematiques");
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  await page.getByRole("link", { name: "Théorème de Thalès" }).click();
  await page.getByLabel("Ta question").fill("Pourquoi les droites doivent-elles être parallèles ?");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeEnabled();
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const [nom] = (await caches.keys()).filter((n) => n.startsWith("chapitres-"));
        const copie = nom ? await (await caches.open(nom)).match(location.pathname) : undefined;
        return copie ? (await copie.text()).includes("parallèles") : false;
      }),
    )
    .toBe(true);
  await couperReseau(context, true);
  await page.reload();
  await page.getByLabel("Ta question").fill("Et la réciproque ?");
  await page.getByRole("button", { name: "Garder pour plus tard" }).click();
  await expect(page.locator(".en-attente")).toBeVisible();
  await capture(page, "hors-ligne-chapitre-et-question-gardee");
  await page.goto("/catalogue");
  await expect(page.getByRole("heading", { name: "Pas de connexion" })).toBeVisible();
  await capture(page, "hors-ligne-chapitres-enregistres");
  await couperReseau(context, false);
  await page.goto("/catalogue/ga-3e-mathematiques/thales");
  await expect(page.locator(".en-attente")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeEnabled();
  await capture(page, "retour-du-reseau-question-envoyee");

  // 3. Mathématiques au lycée : Terminale D, chapitres de sa série, Tuteur jusqu'à la Seconde.
  await page.goto("/espace");
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/$/);
  await inscrireEleveActif(page, ELEVE_TLE_D, "Terminale", "D");
  await page.goto("/catalogue/ga-tle-d-mathematiques");
  await capture(page, "lycee-terminale-d-catalogue");
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
  await capture(page, "lycee-tuteur-remonte-a-la-seconde");

  // 4. Pilotage de l'exploitation (administration) : coûts, file humaine, activité, export agrégé.
  await creerAdministrateurFictif(ADMIN);
  await page.context().clearCookies();
  await seConnecter(page, ADMIN);
  await page.goto("/administration/exploitation");
  await expect(page.getByRole("heading", { name: "Pilotage de l'exploitation" })).toBeVisible();
  await capture(page, "administration-pilotage-exploitation");
});
