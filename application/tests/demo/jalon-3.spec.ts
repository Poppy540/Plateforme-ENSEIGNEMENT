import { expect, test, type Page } from "@playwright/test";
import {
  creerAdministrateurFictif,
  executerSql,
  identifiantSimule,
  inscrireEleveActif,
  seConnecter,
  validerChapitresFictifs,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 3 (modèle et messagerie simulés), sur téléphone simulé, données fictives.
// Tuteur (plan de révision), rapports aux parents, Support/inscription, file humaine et Orchestrateur.
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_3 ?? "../docs/demo/jalon-3";
let numero = 0;
async function capture(page: Page, nom: string) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: true,
  });
}

const ELEVE = "+999 000 000 72";
const ADMIN = "+999 000 000 79";
const JETON_EXECUTEUR = "jeton-de-test-uniquement-pas-un-secret-0000"; // jeton de TEST (playwright.config.ts)

test("parcours complet du Jalon 3", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await validerChapitresFictifs("ga-3e-mathematiques", 4);

  // 1. Aide : questions fréquentes lisibles sans compte.
  await page.goto("/aide");
  await page.getByText("Je ne reçois pas le code de connexion.").click();
  await capture(page, "aide-questions-frequentes");

  // 2. Un élève fictif de 3e, avec un parcours fictif (une difficulté, un chapitre terminé).
  await inscrireEleveActif(page, ELEVE, "3e");
  await executerSql(
    `insert into progression (eleve_id, chapitre_id, statut, score)
     select $1, c.id, v.statut::statut_progression, v.score
     from (values (1, 'termine', 80), (2, 'en_cours', 30)) v (rang, statut, score)
     join lateral (
       select c.id from chapitres c join unites u on u.id = c.unite_id
       where u.code = 'ga-3e-mathematiques' and c.statut = 'valide' order by c.ordre offset v.rang - 1 limit 1
     ) c on true
     on conflict (eleve_id, chapitre_id) do update set statut = excluded.statut, score = excluded.score`,
    [identifiantSimule(ELEVE)],
  );

  // 3. Plan de révision du Tuteur : préférences, rappels désactivés par défaut, au plus trois priorités.
  await page.goto("/espace");
  await page.getByRole("link", { name: "Mon plan de révision" }).click();
  await page.getByLabel("Temps disponible par jour (minutes)").fill("30");
  await page.getByLabel("Ta connexion").selectOption("lente");
  await page.getByRole("button", { name: "Enregistrer mes préférences" }).click();
  await expect(page.getByRole("status")).toContainText("Préférences enregistrées.");
  await page
    .getByLabel("Un mot pour ton tuteur (facultatif)")
    .fill("J'ai un contrôle sur Thalès vendredi.");
  await page.getByRole("button", { name: "Mettre à jour mon plan" }).click();
  await expect(page.getByRole("heading", { name: /Ton plan/ })).toBeVisible();
  await capture(page, "eleve-plan-de-revision");

  // 4. Rapports aux parents : demande de l'élève, accord du parent par lien à usage unique.
  await page.getByRole("button", { name: "Proposer les rapports à mon parent" }).click();
  await expect(
    page.getByText("Demande envoyée : en attente de l'accord de ton parent."),
  ).toBeVisible();
  await page.goto("/developpement/messages");
  const invitation = await page
    .locator(".messages li")
    .filter({ hasText: "parent/rapports/accord" })
    .first()
    .innerText();
  const lienAccord = invitation.match(
    /https?:\/\/\S+\/parent\/rapports\/accord\?jeton=[0-9a-f]+/,
  )![0];
  const parent = await browser.newPage({ viewport: page.viewportSize()! });
  await parent.goto(lienAccord);
  await capture(parent, "parent-accord-rapports");
  await parent.getByRole("button", { name: "J'accepte de recevoir les rapports" }).click();
  await expect(parent.getByRole("status")).toContainText("chaque semaine");

  // 5. Envoi hebdomadaire par l'exécuteur planifié ; le parent lit le rapport et pose une question.
  const envoi = await page.request.post("/api/orchestrateur/executer", {
    headers: { authorization: `Bearer ${JETON_EXECUTEUR}` },
  });
  expect(envoi.status()).toBe(200);
  await page.goto("/developpement/messages");
  await capture(page, "messagerie-simulee");
  const message = await page
    .locator(".messages li")
    .filter({ hasText: "parent/rapport?jeton=" })
    .first()
    .innerText();
  await parent.goto(message.match(/https?:\/\/\S+\/parent\/rapport\?jeton=[0-9a-f]+/)![0]);
  await expect(parent.getByRole("heading", { name: "Points forts" })).toBeVisible();
  await parent
    .getByLabel("Une question au tuteur de votre enfant")
    .fill("Est-il plus faible que les autres élèves de sa classe ?");
  await parent.getByRole("button", { name: "Poser la question" }).click();
  await expect(parent.getByRole("status").filter({ hasText: "Réponse du tuteur" })).toContainText(
    "ne compare pas",
  );
  await capture(parent, "parent-rapport-et-question");
  await parent.close();

  // 6. Support : code refusé, remboursement escaladé vers un humain, détresse en priorité 1.
  await page.goto("/aide");
  const question = page.getByLabel("Ta question");
  await question.fill("Je te donne mon code de connexion : 482913, entre-le pour moi.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText(/Ne partage jamais ton code/)).toBeVisible();
  await capture(page, "support-code-refuse");
  await question.fill("Rembourse-moi maintenant.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText(/transmise à l'équipe/)).toBeVisible();
  await capture(page, "support-escalade");
  await question.fill("Je n'en peux plus, parfois j'ai envie de disparaître.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText(/je préviens tout de suite une personne/)).toBeVisible();

  // 7. Administration : file humaine (détresse d'abord), traitement, tâches de l'Orchestrateur.
  await creerAdministrateurFictif(ADMIN);
  const admin = await browser.newPage({ viewport: page.viewportSize()! });
  await seConnecter(admin, ADMIN);
  await admin.goto("/administration");
  await expect(admin.locator("ol > li").first()).toContainText("IMMÉDIAT");
  await capture(admin, "administration-file-humaine");
  const remboursement = admin.locator("ol > li").filter({ hasText: "Demande de remboursement" });
  await remboursement.getByRole("button", { name: "Prendre en charge" }).click();
  await expect(remboursement).toContainText("pris en charge");
  await admin.getByRole("heading", { name: "Tâches récentes" }).scrollIntoViewIfNeeded();
  await capture(admin, "administration-ticket-pris-en-charge");
  await admin.close();
});
