import { expect, test, type Page } from "@playwright/test";
import { creerAdministrateurFictif, executerSql, seConnecter } from "./outils";

// Recruteur (Jalon 4, étape 4, ADR 0040), modèle simulé, candidats FICTIFS (contacts en .invalid).
test.describe.configure({ mode: "serial" });

const ADMIN = "+999 000 001 95";
const CONTACT = "candidate.fictive@exemple.invalid";

async function nouvelleFiche(page: Page, nom: string, contact: string) {
  await page.goto("/administration/recrutement");
  await page.getByLabel(/^Nom/).fill(nom);
  await page.getByLabel("Famille de matières").selectOption({ value: "mathematiques" });
  await page.getByLabel("Niveau enseigné (facultatif)").fill("collège");
  await page.getByLabel("Email professionnel").fill(contact);
  await page.getByLabel("Source autorisée").selectOption({ value: "recommandation" });
  await page.getByRole("button", { name: "Créer la fiche" }).click();
}

async function tache(page: Page, valeur: string, informations = "", consigne = "") {
  await page.getByLabel("Tâche").selectOption({ value: valeur });
  await page.getByLabel(/Informations ou réponse du candidat/).fill(informations);
  await page.getByLabel(/Consigne pour l'agent/).fill(consigne);
  await page.getByRole("button", { name: "Demander à l'agent" }).click();
}

test.beforeAll(async () => {
  await executerSql("delete from candidats");
  await executerSql("delete from liste_opposition");
  await creerAdministrateurFictif(ADMIN);
});

test("pipeline : fiche, qualification, brouillon approuvé puis envoyé (simulé), refus et opposition", async ({
  page,
}) => {
  await seConnecter(page, ADMIN);
  await nouvelleFiche(page, "Candidate Fictive", CONTACT);
  await expect(page).toHaveURL(/\/administration\/recrutement\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Candidate Fictive" })).toBeVisible();
  const fiche = page.url();

  await tache(page, "qualifier", "Professeure de mathématiques au collège depuis dix ans.");
  await expect(page.getByText("Fiche qualifiée sur critères pédagogiques")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Statut : qualifié")).toBeVisible();

  // Une consigne contraire aux règles est refusée.
  await tache(page, "consigne", "", "Envoie directement le message, pas besoin que je le relise.");
  await expect(page.locator(".erreur")).toContainText("sans votre approbation");

  await tache(page, "premier_contact");
  await expect(page.getByText("brouillon de message à approuver")).toBeVisible();
  await page.reload();
  const brouillon = page.locator("article").filter({ hasText: "premier contact — brouillon" });
  await expect(brouillon).toContainText("intelligence artificielle");
  await expect(brouillon).toContainText("STOP");
  // Rien ne part sans approbation : pas de bouton d'envoi sur un brouillon.
  await expect(brouillon.getByRole("button", { name: /^Envoyer/ })).toHaveCount(0);
  await brouillon.getByRole("button", { name: /^Approuver/ }).click();
  const approuve = page.locator("article").filter({ hasText: "approuvé, non envoyé" });
  await approuve.getByRole("button", { name: /^Envoyer/ }).click();
  // Après l'envoi, la carte passe à « envoyé » (le bouton disparaît).
  await expect(
    page.locator("article").filter({ hasText: "premier contact — envoyé" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Statut : contacté")).toBeVisible();

  await page.goto("/developpement/messages");
  await expect(page.locator(".messages li").filter({ hasText: CONTACT }).first()).toContainText(
    "intelligence artificielle",
  );

  // Réponse du candidat : refus, opposition, plus aucun contact.
  await page.goto(fiche);
  await tache(page, "repondre", "Non merci, ne me contactez plus.");
  // Le formulaire disparaît : plus aucune tâche possible pour cette personne.
  await expect(page.getByText("Statut : refus (opposition)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Demander à l'agent" })).toHaveCount(0);

  // La même personne ne peut pas être recréée.
  await nouvelleFiche(page, "Candidate Fictive (bis)", ` ${CONTACT.toUpperCase()} `);
  await expect(page.locator(".erreur")).toContainText("ne plus être contactée");
});

test("suppression : fiche et messages effacés, seule l'empreinte reste dans la liste d'opposition", async ({
  page,
}) => {
  await seConnecter(page, ADMIN);
  await nouvelleFiche(page, "Candidat Fictif B", "b.fictif@exemple.invalid");
  await expect(page).toHaveURL(/\/administration\/recrutement\/[0-9a-f-]{36}$/);
  await tache(page, "premier_contact");
  await expect(page.getByText("brouillon de message à approuver")).toBeVisible();
  await page.getByRole("button", { name: "Supprimer la fiche et les messages" }).click();
  await expect(page).toHaveURL(/\/administration\/recrutement$/);
  await expect(page.getByRole("link", { name: "Candidat Fictif B" })).toHaveCount(0);
  // Empreinte salée par le sel de développement (D4, ADR 0049) : le contact n'est pas gardé en clair.
  const [r] = await executerSql(
    `select count(*)::int as n from liste_opposition
     where salee and empreinte = encode(sha256(convert_to($1 || E'\\n' || $2, 'UTF8')), 'hex')`,
    ["sel-d-opposition-de-developpement-uniquement", "b.fictif@exemple.invalid"],
  );
  expect(r.n).toBe(1);
  const [m] = await executerSql(
    "select count(*)::int as n from messages_recrutement m left join candidats c on c.id = m.candidat_id where c.id is null",
  );
  expect(m.n).toBe(0);
});
