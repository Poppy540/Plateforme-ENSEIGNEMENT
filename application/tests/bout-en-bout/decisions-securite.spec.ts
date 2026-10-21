import { expect, test } from "@playwright/test";
import { creerAdministrateurFictif, executerSql, seConnecter } from "./outils";

// Décisions de la revue de sécurité (Jalon 6, étape 1 ; ADR 0049) : politique de contenu à nonce, sessions
// révocables, indicatifs autorisés, suppression d'un document officiel, export pour l'équipe.
test.describe.configure({ mode: "serial" });

const ELEVE = "+999 000 006 11";
const ADMIN = "+999 000 006 12";

test("politique de contenu : scripts autorisés par un nonce propre à chaque page", async ({
  page,
}) => {
  const politique = async () =>
    (await page.goto("/connexion"))!.headers()["content-security-policy"];
  const premiere = await politique();
  const scripts = premiere.split("; ").find((d) => d.startsWith("script-src"))!;
  expect(scripts).toMatch(/'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(scripts).not.toContain("unsafe-inline");
  expect(premiere).toContain("frame-ancestors 'none'");
  expect(await politique()).not.toBe(premiere);
  // Les scripts de Next.js portent le nonce : la page est interactive (le formulaire répond).
  await page.getByLabel("Ton numéro de téléphone").fill("pas un numéro");
  await page.getByRole("button", { name: "Recevoir un code" }).click();
  await expect(page.locator(".erreur")).toContainText("format international");
});

test("un numéro d'un pays non ouvert ne reçoit pas de code", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Ton numéro de téléphone").fill("+1 202 555 0100");
  await page.getByRole("button", { name: "Recevoir un code" }).click();
  await expect(page.locator(".erreur")).toContainText("pas pris en charge");
});

test("la déconnexion révoque la session : le cookie copié ne sert plus", async ({
  page,
  browser,
}) => {
  await seConnecter(page, ELEVE);
  const cookies = await page.context().cookies();
  await page.goto("/inscription");
  // Une copie du cookie fonctionne tant que la session est ouverte…
  const copie = await browser.newContext();
  await copie.addCookies(cookies);
  const autre = await copie.newPage();
  await autre.goto("/inscription");
  await expect(autre).toHaveURL(/\/inscription$/);
  // … plus après la déconnexion (révoquée en base).
  await page.goto("/espace/mes-donnees");
  await page.getByRole("button", { name: "Me déconnecter de tous mes appareils" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
  await autre.goto("/inscription");
  await expect(autre).toHaveURL(/\/connexion$/);
  await copie.close();
});

test("le propriétaire supprime un document officiel ; l'équipe exporte ses données", async ({
  page,
}) => {
  await creerAdministrateurFictif(ADMIN);
  await executerSql(
    `insert into documents_officiels (referentiel_id, titre, origine, format, texte, empreinte)
     select id, 'Document fictif à supprimer', 'Test', 'texte', 'Texte fictif', 'e' from referentiels
     where code = 'ga-general'`,
  );
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  const ligne = page.getByRole("listitem").filter({ hasText: "Document fictif à supprimer" });
  await ligne.getByLabel("Je confirme").check();
  await ligne.getByRole("button", { name: "Supprimer « Document fictif à supprimer »" }).click();
  await expect(page.getByText("Document fictif à supprimer")).toHaveCount(0);
  const [trace] = await executerSql(
    "select count(*)::int as n from journal_audit where action = 'suppression_document_officiel'",
  );
  expect(trace.n).toBeGreaterThan(0);

  await page.getByRole("link", { name: "Mes données" }).click();
  await expect(
    page.getByRole("button", { name: "Supprimer définitivement mon compte" }),
  ).toHaveCount(0);
  const reponse = await page.request.get("/api/mes-donnees");
  const donnees = await reponse.json();
  expect(donnees.profil.role).toBe("administrateur");
  expect(donnees).toHaveProperty("decisions_de_validation");
  expect(donnees).toHaveProperty("documents_deposes");
});
