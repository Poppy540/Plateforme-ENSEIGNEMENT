import { expect, test } from "@playwright/test";
import { executerSql, seConnecter } from "./outils";

const ELEVE = "+999 000 001 01"; // élève de 3e inscrit par les tests du catalogue

test("Tuteur (modèle simulé) : préférences, rappels désactivés par défaut, plan d'au plus trois priorités", async ({
  page,
}) => {
  await seConnecter(page, ELEVE);
  await page.getByRole("link", { name: "Mon plan de révision" }).click();
  await expect(page.getByRole("heading", { name: "Mon plan de révision" })).toBeVisible();
  await expect(page.getByText("Pas encore de plan")).toBeVisible();
  await expect(page.getByLabel(/Recevoir des rappels/)).not.toBeChecked();

  await page.getByLabel("Temps disponible par jour (minutes)").fill("30");
  await page.getByLabel("Ta connexion").selectOption("lente");
  await page.getByRole("button", { name: "Enregistrer mes préférences" }).click();
  await expect(page.getByRole("status")).toContainText("Préférences enregistrées.");

  await page
    .getByLabel("Un mot pour ton tuteur (facultatif)")
    .fill("Je veux réviser six heures par nuit.");
  await page.getByRole("button", { name: "Mettre à jour mon plan" }).click();
  await expect(page.getByRole("heading", { name: /Ton plan/ })).toBeVisible();
  const priorites = page.locator("section ol li");
  expect(await priorites.count()).toBeGreaterThan(0);
  expect(await priorites.count()).toBeLessThanOrEqual(3);
  await expect(page.getByText(/dors suffisamment/)).toBeVisible();

  const [enregistre] = await executerSql(
    `select jsonb_array_length(r.priorites) as n, p.rappels_actifs, p.minutes_par_jour
     from recommandations_tuteur r join preferences_eleves p on p.eleve_id = r.eleve_id
     order by r.cree_le desc limit 1`,
  );
  expect(enregistre.n).toBeLessThanOrEqual(3);
  expect(enregistre).toMatchObject({ rappels_actifs: false, minutes_par_jour: 30 });
});

test("rapports aux parents : accord par lien, rapport hebdomadaire, question du parent, arrêt", async ({
  page,
  browser,
}) => {
  await seConnecter(page, ELEVE);
  await page.goto("/espace/plan");
  await page.getByRole("button", { name: "Proposer les rapports à mon parent" }).click();
  await expect(
    page.getByText("Demande envoyée : en attente de l'accord de ton parent."),
  ).toBeVisible();

  // Le parent (sans compte) accepte depuis le lien reçu.
  await page.goto("/developpement/messages");
  const invitation = await page
    .locator(".messages li")
    .filter({ hasText: "parent/rapports/accord" })
    .first()
    .innerText();
  const lienAccord = invitation.match(
    /https?:\/\/\S+\/parent\/rapports\/accord\?jeton=[0-9a-f]+/,
  )![0];
  const parent = await browser.newPage();
  await parent.goto(lienAccord);
  await parent.getByRole("button", { name: "J'accepte de recevoir les rapports" }).click();
  await expect(parent.getByRole("status")).toContainText(
    "Vous recevrez un court rapport chaque semaine",
  );
  await page.goto("/espace/plan");
  await expect(page.getByText("Ton parent reçoit les rapports.")).toBeVisible();

  // Envoi hebdomadaire par l'exécuteur planifié (jeton de test).
  const reponse = await page.request.post("/api/orchestrateur/executer", {
    headers: { authorization: "Bearer jeton-de-test-uniquement-pas-un-secret-0000" },
  });
  expect(reponse.status()).toBe(200);
  expect((await reponse.json()).rapports).toBe(1);
  await page.goto("/developpement/messages");
  const message = await page
    .locator(".messages li")
    .filter({ hasText: "parent/rapport?jeton=" })
    .first()
    .innerText();
  // La boîte simulée affiche le destinataire en première ligne ; le texte du message ne recopie pas le contact.
  expect(message.split("\n").slice(1).join("\n")).not.toMatch(/\+999/);
  const lienRapport = message.match(/https?:\/\/\S+\/parent\/rapport\?jeton=[0-9a-f]+/)![0];

  await parent.goto(lienRapport);
  await expect(
    parent.getByRole("heading", { name: /Rapport sur la progression de/ }),
  ).toBeVisible();
  await expect(parent.getByRole("heading", { name: "Points forts" })).toBeVisible();
  await parent
    .getByLabel("Une question au tuteur de votre enfant")
    .fill("Est-il plus faible que les autres élèves de sa classe ?");
  await parent.getByRole("button", { name: "Poser la question" }).click();
  await expect(parent.getByRole("status").filter({ hasText: "Réponse du tuteur" })).toContainText(
    "ne compare pas",
  );
  await parent.getByRole("button", { name: "Recevoir un nouveau rapport maintenant" }).click();
  await expect(parent.locator(".erreur")).toContainText("déjà été envoyé aujourd'hui");
  await parent.getByRole("button", { name: "Ne plus recevoir de rapports" }).click();
  await expect(parent.getByText(/Les rapports sont arrêtés/)).toBeVisible();

  await page.goto("/espace/plan");
  await expect(
    page.getByRole("button", { name: "Proposer les rapports à mon parent" }),
  ).toBeVisible();
  const [rapports] = await executerSql(
    "select count(*)::int as n, bool_and(statut = 'envoye') as envoyes from rapports_parents",
  );
  expect(rapports).toEqual({ n: 1, envoyes: true });
  await parent.close();
});
