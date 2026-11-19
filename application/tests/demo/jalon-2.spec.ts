import { expect, test, type Page } from "@playwright/test";
import {
  creerInvitationFictive,
  executerSql,
  inscrireEleveActif,
  seConnecter,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 2 (agents et vidéo simulés), sur téléphone simulé, données fictives.
// Chaîne complète : script → validation → production vidéo → revue → publication → quiz → élève.
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_2 ?? "../docs/demo/jalon-2";
let numero = 0;
async function capture(page: Page, nom: string) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: true,
  });
}

test("parcours complet du Jalon 2", async ({ page, browser }) => {
  test.setTimeout(180_000);
  // Chapitre « Théorème de Thalès » validé (s'il ne l'est pas déjà par le parcours du Jalon 1).
  await executerSql(
    `insert into auth.users (id) values ('99999999-9999-4999-8999-999999999999') on conflict do nothing;
     insert into profils (id, role, prenom_ou_pseudo)
       values ('99999999-9999-4999-8999-999999999999', 'referent', 'Référent fictif') on conflict do nothing;
     with choisi as (
       select c.id, c.version, c.empreinte from chapitres c join unites u on u.id = c.unite_id
       where u.code = 'ga-3e-mathematiques' and c.code = 'thales' and c.statut <> 'valide'
     ), trace as (
       insert into approbations (objet_type, objet_id, version, empreinte, decision, commentaire, valideur_id)
       select 'chapitre', id, version, empreinte, 'valide', 'Démonstration', '99999999-9999-4999-8999-999999999999'
       from choisi
     )
     update chapitres set statut = 'valide' where id in (select id from choisi);`,
  );
  await creerInvitationFictive("DEMO-REFE-0002", ["mathematiques"]);
  const [chapitre] = await executerSql(
    `select c.id from chapitres c join unites u on u.id = c.unite_id
     where u.code = 'ga-3e-mathematiques' and c.code = 'thales'`,
  );

  // 1. Le référent fait rédiger un script par le Scénariste.
  await seConnecter(page, "+999 000 000 54");
  await page.getByRole("link", { name: "Activer votre accès avec votre code" }).click();
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Mme Référente fictive");
  await page.getByLabel("Code d'invitation").fill("DEMO-REFE-0002");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await page.goto(`/referent/chapitres/${chapitre.id}`);
  await page.getByLabel(/Durée cible/).fill("8");
  await page
    .getByLabel(/Consigne pour le Scénariste/)
    .fill("Prends un exemple avec l'ombre d'un arbre.");
  await page.getByRole("button", { name: "Générer un brouillon de script" }).click();
  await expect(page.getByRole("status")).toContainText("Brouillon version 1 créé");
  await page.getByRole("heading", { name: "Scripts de cours vidéo" }).scrollIntoViewIfNeeded();
  await capture(page, "generation-script");

  // 2. Relecture et validation du script.
  await page.getByRole("link", { name: "Version 1" }).click();
  await expect(page.getByText("Statut : Brouillon")).toBeVisible();
  await capture(page, "script-brouillon");
  await page.getByLabel(/J'ai vérifié les points/).check();
  await page.getByLabel(/Commentaire/).fill("Relu : conforme au programme.");
  await page.getByRole("button", { name: "Valider la version 1" }).click();
  await expect(page.getByText("Statut : Validé")).toBeVisible();

  // 3. Production vidéo (services simulés) : vidéo déposée « à relire ».
  await page.getByRole("button", { name: /Lancer la production de la version 1/ }).click();
  await expect(page.getByRole("status")).toContainText("Vidéo produite et déposée « à relire »");
  await page.getByRole("heading", { name: "Production vidéo" }).scrollIntoViewIfNeeded();
  await capture(page, "production-video");

  // 4. Revue de la vidéo, validation, puis publication (acte distinct).
  await page.getByRole("link", { name: "voir la vidéo" }).click();
  await expect(page.getByText("Statut : À relire")).toBeVisible();
  await capture(page, "revue-video");
  await page.getByLabel(/J'ai regardé toute la vidéo/).check();
  await page.getByRole("button", { name: /Valider la version 1/ }).click();
  await expect(page.getByText("Statut : Validée (non publiée)")).toBeVisible();
  await page.getByLabel(/Je confirme la publication/).check();
  await capture(page, "publication-video");
  await page.getByRole("button", { name: "Publier la vidéo pour les élèves" }).click();
  await expect(page.getByText("Statut : Publiée")).toBeVisible();

  // 5. Quiz de l'Évaluateur : brouillon relu puis validé.
  await page.goto(`/referent/chapitres/${chapitre.id}`);
  await page.getByLabel("Nombre de questions").fill("3");
  await page.getByRole("button", { name: "Générer un quiz brouillon" }).click();
  await expect(page.getByRole("status")).toContainText("Quiz version 1 créé");
  await page.goto("/referent");
  await capture(page, "tableau-referent");
  await page.goto(`/referent/chapitres/${chapitre.id}`);
  await page.getByRole("link", { name: "Quiz version 1" }).click();
  await capture(page, "quiz-brouillon");
  await page.getByLabel(/J'ai vérifié les points/).check();
  await page.getByRole("button", { name: "Valider la version 1" }).click();
  await expect(page.getByText("Statut : Validé")).toBeVisible();

  // 6. L'élève regarde la vidéo, passe le quiz et conteste une correction.
  const eleve = await browser.newPage({ viewport: page.viewportSize()! });
  await inscrireEleveActif(eleve, "+999 000 000 52", "3e");
  await eleve.goto("/catalogue/ga-3e-mathematiques/thales");
  await expect(eleve.locator("video")).toBeVisible();
  await capture(eleve, "eleve-video-faible-debit");
  await eleve.getByRole("link", { name: "Faire le quiz du chapitre" }).click();
  await eleve.getByLabel("4", { exact: true }).check();
  await eleve.getByLabel("Faux").check();
  await eleve.getByLabel("Ta réponse à la question 3").fill("3 × 4 = 12");
  await capture(eleve, "eleve-quiz");
  await eleve.getByRole("button", { name: "Envoyer mes réponses" }).click();
  await expect(eleve.getByText(/Ton score : 67 \/ 100/)).toBeVisible();
  await capture(eleve, "eleve-correction");
  const question2 = eleve.locator("section").filter({ hasText: "Question 2" });
  await question2.getByText("Je conteste cette correction").click();
  await question2
    .getByLabel("Explique pourquoi")
    .fill("Je pense qu'un carré a quatre côtés égaux, mais j'ai mal lu.");
  await question2.getByRole("button", { name: "Envoyer ma contestation" }).click();
  await expect(question2.getByRole("status")).toBeVisible();
  await question2.scrollIntoViewIfNeeded();
  await capture(eleve, "eleve-contestation");
  await eleve.close();
});
