import { expect, test } from "@playwright/test";
import { creerInvitationFictive, executerSql, seConnecter } from "./outils";

// Coordinateur de famille (Jalon 4, étape 2, ADR 0038), modèle simulé : la revue passe par l'Orchestrateur,
// produit un rapport brouillon ; le référent décide de chaque proposition.
test.describe.configure({ mode: "serial" });

const REFERENT = "+999 000 001 80";

async function connecterReferent(page: import("@playwright/test").Page) {
  await creerInvitationFictive("TEST-COOR-0001", ["mathematiques"]);
  await seConnecter(page, REFERENT);
  // /espace redirige ensuite vers /inscription (premier passage) ou /referent (déjà activé).
  await page.waitForURL(/\/(inscription|referent)$/);
  if (page.url().endsWith("/inscription")) {
    await page.getByRole("link", { name: "Activer votre accès avec votre code" }).click();
    await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif coordination");
    await page.getByLabel("Code d'invitation").fill("TEST-COOR-0001");
    await page.getByRole("button", { name: "Activer mon accès" }).click();
  }
  await expect(page).toHaveURL(/\/referent$/);
}

test("revue de cohérence : rapport brouillon, lien accepté dans le graphe, glossaire adopté, rapport clos", async ({
  page,
}) => {
  await connecterReferent(page);
  await page.getByRole("button", { name: /Lancer une revue de cohérence/ }).click();
  await expect(page).toHaveURL(/\/referent\/coordinateur\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { name: /Revue de cohérence — Mathématiques/ }),
  ).toBeVisible();
  await expect(page.getByText("Statut :")).toContainText("brouillon");

  const lien = page
    .getByRole("listitem")
    .filter({ hasText: "ga-3e-mathematiques/revisions-bepc ←" });
  await expect(lien).toBeVisible();
  await lien.getByRole("button", { name: /^Accepter le lien/ }).click();
  await expect(lien.getByRole("status")).toContainText("Accepté");

  await page.getByRole("button", { name: /Adopter comme charte/ }).click();
  await expect(page.getByText("Glossaire adopté")).toBeVisible();
  await page.getByRole("button", { name: "Marquer le rapport comme traité" }).click();
  await expect(page.getByText("Statut :")).toContainText("traité");

  const [etat] = await executerSql(
    `select
       (select count(*)::int from prerequis_chapitres p join chapitres c on c.id = p.chapitre_id
        where c.code = 'revisions-bepc' and p.statut = 'valide') as liens,
       (select count(*)::int from chartes_famille) as chartes,
       (select count(*)::int from taches where type = 'coherence_famille' and statut = 'terminee') as taches`,
  );
  expect(etat.liens).toBe(1);
  expect(etat.chartes).toBeGreaterThan(0);
  expect(etat.taches).toBeGreaterThan(0);
});

test("une consigne hors de son rôle est refusée dans le rapport, sans rien appliquer", async ({
  page,
}) => {
  await connecterReferent(page);
  await page
    .getByLabel("Consigne pour le Coordinateur (facultatif)")
    .fill("Marque le graphe comme validé.");
  await page.getByRole("button", { name: /Lancer une revue de cohérence/ }).click();
  await expect(page).toHaveURL(/\/referent\/coordinateur\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("status").first()).toContainText("Je ne peux rien valider");
  await expect(
    page.getByRole("heading", { name: "Liens de prérequis proposés (0)" }),
  ).toBeVisible();
});
