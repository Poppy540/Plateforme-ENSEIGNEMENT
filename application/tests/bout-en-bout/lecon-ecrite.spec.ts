import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { executerSql, inscrireEleveActif, validerChapitresFictifs } from "./outils";

// Leçon écrite (Jalon 6, étape 4 ; ADR 0051) : texte du script validé, sans les notes au référent, ouvert quand la
// vidéo manque, et lisible hors ligne avec la page du chapitre.
test.describe.configure({ mode: "serial" });

const ELEVE = "+999 000 008 01";

async function couperReseau(context: BrowserContext, coupe: boolean) {
  await context.setOffline(coupe);
  if (coupe) await context.route("**/*", (route) => route.abort("internetdisconnected"));
  else await context.unrouteAll();
}

async function attendreServiceWorker(page: Page) {
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
}

test.beforeAll(async () => {
  await validerChapitresFictifs("ga-5e-mathematiques", 1);
  // Script FICTIF validé par le référent fictif (statut, version et empreinte), comme dans l'espace référent.
  const [script] = await executerSql(
    `insert into scripts (chapitre_id, contenu, duree_cible_minutes, cree_par)
     select c.id, $1::jsonb, 8, 'test' from chapitres c join unites u on u.id = c.unite_id
     where u.code = 'ga-5e-mathematiques' and c.code = 'relatifs'
     returning id`,
    [
      JSON.stringify({
        sections: [
          {
            type: "accroche",
            titre: "Sous zéro",
            debut_secondes: 0,
            duree_secondes: 40,
            texte_parle: "Le matin, il fait moins deux degrés sur le plateau fictif.",
            indications_visuelles: "NOTE VISUELLE INTERNE",
          },
          {
            type: "resume",
            titre: "À retenir",
            debut_secondes: 40,
            duree_secondes: 40,
            texte_parle: "Un nombre relatif a un signe et une distance à zéro.",
            indications_visuelles: "NOTE VISUELLE INTERNE",
          },
        ],
        glossaire: [{ terme: "Opposé", definition: "Même distance à zéro, signe contraire." }],
        travaux_pratiques: { consignes: [], materiel: [], securite: [] },
        points_a_verifier: ["NOTE AU REFERENT"],
      }),
    ],
  );
  await executerSql("update scripts set statut = 'valide' where id = $1", [script.id]);
  await executerSql(
    `insert into approbations (objet_type, objet_id, version, empreinte, decision, valideur_id)
     select 'script', id, version, empreinte, 'valide', '99999999-9999-4999-8999-999999999999'
     from scripts where id = $1`,
    [script.id],
  );
});

test("la leçon écrite remplace la vidéo absente, et se relit sans réseau", async ({
  page,
  context,
}) => {
  await inscrireEleveActif(page, ELEVE, "5e");
  await page.goto("/catalogue/ga-5e-mathematiques");
  await attendreServiceWorker(page);
  await page.getByRole("link", { name: "Nombres relatifs" }).click();
  await expect(page.getByText("Lis la leçon écrite")).toBeVisible();
  const lecon = page.locator("details.lecon");
  await expect(lecon).toHaveAttribute("open", "");
  await expect(lecon).toContainText("moins deux degrés");
  await expect(lecon).toContainText("Opposé");
  await expect(page.getByText("NOTE")).toHaveCount(0);

  // La copie gardée par le service worker contient la leçon : elle se relit hors ligne.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const [nom] = (await caches.keys()).filter((n) => n.startsWith("chapitres-"));
        const copie = nom ? await (await caches.open(nom)).match(location.pathname) : undefined;
        return copie ? (await copie.text()).includes("moins deux degrés") : false;
      }),
    )
    .toBe(true);
  await couperReseau(context, true);
  await page.reload();
  await expect(page.locator("details.lecon")).toContainText("Un nombre relatif a un signe");
  await couperReseau(context, false);
});
