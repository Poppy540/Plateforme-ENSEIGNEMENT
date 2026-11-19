import { expect, test, type Page } from "@playwright/test";
import { creerInvitationFictive, executerSql, seConnecter } from "./outils";

// Conformité programme (Jalon 4, étape 3, ADR 0039), modèle simulé, documents FICTIFS.
test.describe.configure({ mode: "serial" });

const REFERENT = "+999 000 001 90";
const PROGRAMME_FICTIF = `[page 1]
1. Théorème de Thalès (12 h)
2. Trigonométrie dans le triangle rectangle (10 h, coefficient 4)
3. Statistiques descriptives`;

async function connecterReferent(page: Page) {
  await creerInvitationFictive("TEST-CONF-0001", ["mathematiques"]);
  await seConnecter(page, REFERENT);
  await page.waitForURL(/\/(inscription|referent)$/);
  if (page.url().endsWith("/inscription")) {
    await page.getByRole("link", { name: "Activer votre accès avec votre code" }).click();
    await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif conformité");
    await page.getByLabel("Code d'invitation").fill("TEST-CONF-0001");
    await page.getByRole("button", { name: "Activer mon accès" }).click();
  }
  await expect(page).toHaveURL(/\/referent$/);
  await page.getByRole("link", { name: "Conformité au programme officiel" }).click();
}

async function deposer(
  page: Page,
  d: { titre: string; origine: string; officiel: boolean; texte?: string; pdf?: Buffer },
) {
  await page.getByLabel("Titre du document").fill(d.titre);
  await page.getByLabel(/Origine/).fill(d.origine);
  if (d.officiel) await page.getByLabel(/Il s'agit d'un document officiel/).check();
  if (d.texte) await page.getByLabel("Texte du document").fill(d.texte);
  if (d.pdf)
    await page
      .getByLabel(/Ou un PDF/)
      .setInputFiles({ name: "programme.pdf", mimeType: "application/pdf", buffer: d.pdf });
  await page.getByRole("button", { name: "Déposer le document" }).click();
}

async function analyser(page: Page, titre: string) {
  const document = page.getByRole("listitem").filter({ hasText: titre });
  await document.getByLabel("Unité à comparer").selectOption({ label: "Mathématiques — 3e" });
  await document.getByRole("button", { name: `Analyser « ${titre} »` }).click();
  await expect(page).toHaveURL(/\/referent\/conformite\/[0-9a-f-]{36}$/);
}

test("document officiel : extraction sourcée, champs manquants, comparaison, brouillon YAML, clôture", async ({
  page,
}) => {
  await connecterReferent(page);
  await deposer(page, {
    titre: "Programme fictif de Maths 3e",
    origine: "Document fictif de test (IPN)",
    officiel: true,
    texte: PROGRAMME_FICTIF,
  });
  await expect(page.getByRole("status")).toContainText("Document déposé.");
  await analyser(page, "Programme fictif de Maths 3e");
  await expect(page.getByText("Statut :")).toContainText("brouillon");

  const thales = page.getByRole("row").filter({ hasText: "1. Théorème de Thalès" });
  await expect(thales).toContainText("page 1, ligne 2");
  await expect(thales).toContainText("source officielle");
  await expect(thales.getByRole("cell").nth(2)).toHaveText("manquant");
  await expect(
    page.getByRole("row").filter({ hasText: "ga-3e-mathematiques/thales" }),
  ).toContainText("réutilisable");
  await expect(
    page.getByRole("row").filter({ hasText: "Statistiques descriptives" }).last(),
  ).toContainText("seulement dans le document");

  const lien = page.getByRole("link", { name: "Télécharger le brouillon de programme (YAML)" });
  const reponse = await page.request.get(await lien.getAttribute("href").then(String));
  expect(reponse.status()).toBe(200);
  const yaml = await reponse.text();
  expect(yaml).toContain("# BROUILLON de programme");
  expect(yaml).toContain("unite: ga-3e-mathematiques");
  expect(yaml).toContain("code: theoreme-de-thales");
  expect(yaml).toContain("volume_horaire: 12");
  expect(yaml).toContain("statut: a_valider");
  expect(yaml).not.toMatch(/statut: valide\b/);

  await page.getByRole("button", { name: "Marquer le rapport comme traité" }).click();
  await expect(page.getByText("Statut :")).toContainText("traité");
  // Le référentiel n'a pas changé : aucun chapitre de 3e créé ni validé par l'analyse.
  const [chapitres] = await executerSql(
    `select count(*)::int as n from chapitres c join unites u on u.id = c.unite_id
     where u.code = 'ga-3e-mathematiques' and c.titre = 'Statistiques descriptives'`,
  );
  expect(chapitres.n).toBe(0);
});

test("source non officielle : données « déduites » et alerte ; PDF accepté, faux PDF refusé", async ({
  page,
}) => {
  await connecterReferent(page);
  await deposer(page, {
    titre: "Programme trouvé sur un blog",
    origine: "un blog d'enseignant (non vérifié)",
    officiel: false,
    texte: PROGRAMME_FICTIF,
  });
  await analyser(page, "Programme trouvé sur un blog");
  await expect(page.getByText("non officiel ou non vérifié", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "document non officiel" }),
  ).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "1. Théorème de Thalès" })).toContainText(
    "déduite",
  );

  await page.goto("/referent/conformite");
  await deposer(page, {
    titre: "Faux PDF",
    origine: "Test",
    officiel: false,
    pdf: Buffer.from("pas un PDF"),
  });
  await expect(page.locator(".erreur")).toContainText("n'est pas un PDF");
  await deposer(page, {
    titre: "PDF fictif",
    origine: "Test",
    officiel: true,
    pdf: Buffer.from("%PDF-1.4\n% document fictif de test\n"),
  });
  await expect(page.getByRole("status")).toContainText("Document déposé.");
  await analyser(page, "PDF fictif");
  await expect(page.getByRole("listitem").filter({ hasText: "document illisible" })).toBeVisible();
});

test("dépôt refusé à quelqu'un qui n'est pas référent", async ({ page }) => {
  await seConnecter(page, "+999 000 001 01");
  const reponse = await page.request.post("/api/conformite/documents", {
    multipart: { titre: "X", origine: "Y", texte: "1. Z" },
    maxRedirects: 0,
  });
  expect(reponse.status()).toBe(403);
});
