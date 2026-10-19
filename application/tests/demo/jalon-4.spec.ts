import { expect, test, type Page } from "@playwright/test";
import {
  creerAdministrateurFictif,
  creerInvitationFictive,
  seConnecter,
  validerChapitresFictifs,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 4 (modèles et messagerie simulés), sur téléphone simulé, données fictives :
// graphe de prérequis, Coordinateur, Conformité programme, Recruteur, second pays fictif « zz ».
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_4 ?? "../docs/demo/jalon-4";
let numero = 0;
async function capture(page: Page, nom: string) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: true,
  });
}

const REFERENT = "+999 000 000 81";
const ADMIN = "+999 000 000 82";
const ELEVE_Z = "+999 000 000 83";

async function tache(page: Page, valeur: string, informations = "") {
  await page.getByLabel("Tâche").selectOption({ value: valeur });
  await page.getByLabel(/Informations ou réponse du candidat/).fill(informations);
  await page.getByRole("button", { name: "Demander à l'agent" }).click();
}

test("parcours complet du Jalon 4", async ({ page }) => {
  test.setTimeout(240_000);
  await validerChapitresFictifs("zz-an3-mathematiques", 3);

  // 1. Référent Maths : graphe de prérequis entre classes, validé lien par lien.
  await creerInvitationFictive("DEMO-JAL4-0001", ["mathematiques"]);
  await seConnecter(page, REFERENT);
  await page.waitForURL(/\/(inscription|referent)$/);
  await page.getByRole("link", { name: "Activer votre accès avec votre code" }).click();
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif");
  await page.getByLabel("Code d'invitation").fill("DEMO-JAL4-0001");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await page.goto("/referent/prerequis");
  await capture(page, "referent-graphe-prerequis");

  // 2. Coordinateur : revue de cohérence de la famille (brouillon, le référent décide).
  await page.goto("/referent");
  await page.getByRole("button", { name: /Lancer une revue de cohérence/ }).click();
  await expect(page).toHaveURL(/\/referent\/coordinateur\/[0-9a-f-]{36}$/);
  await capture(page, "coordinateur-revue-de-coherence");

  // 3. Conformité programme : document fictif déposé, rapport d'écart.
  await page.goto("/referent");
  await page.getByRole("link", { name: "Conformité au programme officiel" }).click();
  await page.getByLabel("Titre du document").fill("Programme fictif de Maths 3e");
  await page.getByLabel(/Origine/).fill("Document FICTIF de démonstration");
  await page.getByLabel(/Il s'agit d'un document officiel/).check();
  await page
    .getByLabel("Texte du document")
    .fill(
      "[page 1]\n1. Théorème de Thalès (12 h)\n2. Trigonométrie (10 h, coefficient 4)\n3. Statistiques",
    );
  await page.getByRole("button", { name: "Déposer le document" }).click();
  const document = page.getByRole("listitem").filter({ hasText: "Programme fictif de Maths 3e" });
  await document.getByLabel("Unité à comparer").selectOption({ label: "Mathématiques — 3e" });
  await document.getByRole("button", { name: /^Analyser/ }).click();
  await expect(page).toHaveURL(/\/referent\/conformite\/[0-9a-f-]{36}$/);
  await capture(page, "conformite-rapport-d-ecart");

  // 4. Recruteur : fiche fictive, brouillon soumis à l'approbation du propriétaire.
  await creerAdministrateurFictif(ADMIN);
  await page.context().clearCookies();
  await seConnecter(page, ADMIN);
  await page.goto("/administration/recrutement");
  await page.getByLabel(/^Nom/).fill("Candidate Fictive");
  await page.getByLabel("Famille de matières").selectOption({ value: "mathematiques" });
  await page.getByLabel("Niveau enseigné (facultatif)").fill("collège");
  await page.getByLabel("Email professionnel").fill("candidate.demo@exemple.invalid");
  await page.getByLabel("Source autorisée").selectOption({ value: "recommandation" });
  await page.getByRole("button", { name: "Créer la fiche" }).click();
  await expect(page).toHaveURL(/\/administration\/recrutement\/[0-9a-f-]{36}$/);
  const fiche = page.url();
  await tache(page, "qualifier", "Professeure de mathématiques au collège depuis dix ans.");
  await expect(page.getByText("Fiche qualifiée")).toBeVisible();
  await tache(page, "premier_contact");
  await expect(page.getByText("brouillon de message à approuver")).toBeVisible();
  await page.goto(fiche);
  await capture(page, "recrutement-brouillon-a-approuver");

  // 5. Approbation (empreinte du texte lu), envoi simulé, message reçu.
  const brouillon = page.locator("article").filter({ hasText: "premier contact — brouillon" });
  await brouillon.getByRole("button", { name: /^Approuver/ }).click();
  await page
    .locator("article")
    .filter({ hasText: "approuvé, non envoyé" })
    .getByRole("button", { name: /^Envoyer/ })
    .click();
  await expect(
    page.locator("article").filter({ hasText: "premier contact — envoyé" }),
  ).toBeVisible();
  await page.goto("/developpement/messages");
  await capture(page, "messagerie-simulee-premier-contact");

  // 6. Réponse « ne me contactez plus » : opposition, plus aucun contact possible.
  await page.goto(fiche);
  await tache(page, "repondre", "Non merci, ne me contactez plus.");
  await expect(page.getByText("Statut : refus (opposition)")).toBeVisible();
  await capture(page, "recrutement-refus-et-opposition");

  // 7. Second pays FICTIF « zz » : aide, inscription et catalogue propres à son pack.
  await page.context().clearCookies();
  await page.goto("/aide?referentiel=zz-general");
  await capture(page, "pays-z-aide");
  await seConnecter(page, ELEVE_Z);
  await page.getByLabel("Ton prénom ou un pseudonyme").fill("Élève fictif Z");
  await page.getByLabel("Pays et programme").selectOption({ value: "zz-general" });
  await page.getByLabel("Ta classe").selectOption({ label: "Année 4" });
  await page.getByLabel("Ta série").selectOption({ value: "SCI" });
  await page.getByLabel("J'ai 16 ans ou plus").check();
  await capture(page, "pays-z-inscription");
  await page.getByLabel("Ta classe").selectOption({ label: "Année 3" });
  await page.getByRole("button", { name: "M'inscrire" }).click();
  await expect(page).toHaveURL(/\/espace$/);
  await page.goto("/catalogue/zz-an3-mathematiques");
  await capture(page, "pays-z-catalogue");
});
