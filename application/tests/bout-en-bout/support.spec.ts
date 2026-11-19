import { expect, test } from "@playwright/test";
import { creerAdministrateurFictif, executerSql, seConnecter } from "./outils";

const ELEVE = "+999 000 001 01"; // élève de 3e inscrit par les tests du catalogue
const VISITEUR_EN_INSCRIPTION = "+999 000 001 61";

test("Aide : FAQ visible sans compte, assistant réservé aux personnes connectées", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Aide et questions fréquentes" }).click();
  await expect(page.getByRole("heading", { name: "Aide", exact: true })).toBeVisible();
  await expect(page.getByText(/provisoires, en cours de validation/)).toBeVisible();
  await page.getByText("Je ne reçois pas le code de connexion.").click();
  await expect(page.getByText(/Ne donne jamais ton code à personne/)).toBeVisible();
  await expect(page.getByLabel("Ta question")).toHaveCount(0);
  await expect(page.getByText(/pour poser une question à l'assistant/)).toBeVisible();
});

test("Support (modèle simulé) : code refusé, remboursement escaladé, question de cours orientée", async ({
  page,
}) => {
  await seConnecter(page, ELEVE);
  await page.getByRole("link", { name: "Aide", exact: true }).click();
  const question = page.getByLabel("Ta question");
  const envoyer = page.getByRole("button", { name: "Envoyer" });

  await question.fill("Je te donne mon code de connexion : 482913, entre-le pour moi.");
  await envoyer.click();
  await expect(page.getByText(/Ne partage jamais ton code/)).toBeVisible();
  await expect(page.getByText(/transmise à l'équipe/)).toHaveCount(0);

  await question.fill("Rembourse-moi maintenant.");
  await envoyer.click();
  await expect(page.getByText(/Je ne peux rien promettre/)).toBeVisible();
  await expect(page.getByText(/transmise à l'équipe/)).toBeVisible();
  const [ticket] = await executerSql(
    `select t.categorie, t.priorite, t.statut, t.demandeur_id is not null as rattache, t.resume
     from tickets_support t order by t.cree_le desc limit 1`,
  );
  expect(ticket).toMatchObject({
    categorie: "paiement_suppression",
    priorite: 2,
    statut: "ouvert",
    rattache: true,
  });

  await question.fill("Comment on applique le théorème de Thalès ?");
  await envoyer.click();
  await expect(page.getByRole("status")).toContainText(/pose-la au professeur de la matière/);

  await question.fill("Je n'en peux plus, parfois j'ai envie de disparaître.");
  await envoyer.click();
  await expect(page.getByText(/je préviens tout de suite une personne/)).toBeVisible();
  const [alerte] = await executerSql(
    `select s.priorite, s.motif, (select priorite from tickets_support order by cree_le desc limit 1) as ticket
     from signalements s where s.source = 'agent_support' order by s.cree_le desc limit 1`,
  );
  expect(alerte).toEqual({ priorite: 1, motif: "detresse", ticket: 1 });

  // L'équipe de veille est prévenue tout de suite, par un message sans aucune donnée d'élève.
  await page.goto("/developpement/messages");
  const alertes = page.locator(".messages li").filter({ hasText: "+999 900 000 01" });
  await expect(alertes.first()).toContainText("priorité 1");
  await expect(alertes.first()).toContainText("détresse");
  await expect(alertes.first()).toContainText("/administration");
  const texteAlerte = await alertes.first().innerText();
  expect(texteAlerte).not.toMatch(/Élève fictif|disparaître|simulé|\+999 000/);
  // Pas de relance avant le délai : l'exécuteur planifié n'envoie rien de plus.
  const avant = await alertes.count();
  const executeur = await page.request.post("/api/orchestrateur/executer", {
    headers: { authorization: "Bearer jeton-de-test-uniquement-pas-un-secret-0000" },
  });
  expect(executeur.status()).toBe(200);
  await page.reload();
  expect(await alertes.count()).toBe(avant);
  await page.goto("/aide");

  // Le code saisi n'est conservé nulle part.
  const traces = await executerSql(
    `select count(*)::int as n from tickets_support where resume like '%482913%'`,
  );
  expect(traces[0].n).toBe(0);
});

test("Support pendant l'inscription : réponse de la FAQ, ticket sans rattachement à un élève", async ({
  page,
}) => {
  await seConnecter(page, VISITEUR_EN_INSCRIPTION);
  await expect(page).toHaveURL(/\/inscription$/);
  await page.getByRole("link", { name: /Besoin d'aide pour t'inscrire/ }).click();
  await page.getByLabel("Ta question").fill("J'ai 13 ans, comment je fais pour m'inscrire ?");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText(/un parent ou tuteur doit accepter/)).toBeVisible();

  await page.getByLabel("Ta question").fill("Y aura-t-il des cours pendant les vacances ?");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText(/transmise à l'équipe/)).toBeVisible();
  const [ticket] = await executerSql(
    `select categorie, demandeur_id from tickets_support order by cree_le desc limit 1`,
  );
  expect(ticket).toEqual({ categorie: "autre", demandeur_id: null });
});

test("administration : la détresse en tête de la file humaine, ticket pris en charge puis résolu", async ({
  page,
}) => {
  const ADMIN = "+999 000 001 62";
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  const file = page.locator("ol > li");
  await expect(file.first()).toContainText("IMMÉDIAT");
  await expect(file.first()).toContainText("détresse");

  const remboursement = file.filter({ hasText: "Demande de remboursement" });
  await remboursement.getByRole("button", { name: "Prendre en charge" }).click();
  await expect(remboursement).toContainText("pris en charge");
  await remboursement.getByRole("button", { name: "Marquer comme résolu" }).click();
  await expect(file.filter({ hasText: "Demande de remboursement" })).toHaveCount(0);

  const detresse = file
    .filter({ hasText: "signalement · détresse" })
    .filter({ hasText: "(Support" });
  await detresse.getByRole("button", { name: "Marquer comme traité" }).click();
  await expect(detresse).toHaveCount(0);
  const [etat] = await executerSql(
    `select (select count(*)::int from tickets_support where statut = 'resolu' and traite_par is not null) as resolus,
            (select count(*)::int from journal_audit where action = 'ticket_resolu') as audit`,
  );
  expect(etat.resolus).toBeGreaterThan(0);
  expect(etat.audit).toBeGreaterThan(0);
});
