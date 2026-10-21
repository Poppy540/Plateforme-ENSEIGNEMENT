import { expect, test, type Page } from "@playwright/test";
import {
  creerAdministrateurFictif,
  creerInvitationFictive,
  executerSql,
  seConnecter,
  validerChapitresFictifs,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 6 (modèles et messagerie simulés), sur téléphone simulé, données fictives :
// décisions de sécurité, Sciences 3e et liens entre familles, leçon écrite, questionnaire anonyme, pilotage.
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_6 ?? "../docs/demo/jalon-6";
let numero = 0;
async function capture(page: Page, nom: string) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: true,
  });
}

const REFERENT = "+999 000 011 01";
const ELEVE_Z = "+999 000 011 02";
const ADMIN = "+999 000 011 03";

async function idChapitre(unite: string, code: string): Promise<string> {
  const [c] = await executerSql(
    "select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 and c.code = $2",
    [unite, code],
  );
  return c.id;
}

/** Script FICTIF validé (statut, version, empreinte), comme après la relecture d'un référent. */
async function scriptValide(unite: string) {
  const [script] = await executerSql(
    `insert into scripts (chapitre_id, contenu, duree_cible_minutes, cree_par)
     select c.id, $2::jsonb, 8, 'demo' from chapitres c join unites u on u.id = c.unite_id
     where u.code = $1 order by c.ordre limit 1 returning id`,
    [
      unite,
      JSON.stringify({
        sections: [
          {
            type: "accroche",
            titre: "Une situation",
            debut_secondes: 0,
            duree_secondes: 60,
            texte_parle:
              "Au marché, un vendeur fictif propose deux offres. Laquelle est la plus avantageuse ? Pour le savoir, il faut mettre le problème en équation.",
            indications_visuelles: "",
          },
          {
            type: "explication",
            titre: "La méthode",
            debut_secondes: 60,
            duree_secondes: 120,
            texte_parle:
              "On choisit l'inconnue, on traduit l'énoncé en équation, on la résout, puis on vérifie que la solution a un sens dans la situation.",
            indications_visuelles: "",
          },
          {
            type: "resume",
            titre: "À retenir",
            debut_secondes: 180,
            duree_secondes: 40,
            texte_parle: "Inconnue, équation, résolution, vérification : quatre étapes, toujours.",
            indications_visuelles: "",
          },
        ],
        glossaire: [{ terme: "Inconnue", definition: "Nombre que l'on cherche, noté x." }],
        travaux_pratiques: { consignes: [], materiel: [], securite: [] },
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
}

test("parcours complet du Jalon 6", async ({ page }) => {
  test.setTimeout(240_000);
  await validerChapitresFictifs("zz-an3-mathematiques", 2);
  await scriptValide("zz-an3-mathematiques");

  // 1. Connexion : seuls les numéros des pays ouverts reçoivent un code.
  await page.goto("/connexion");
  await page.getByLabel("Ton numéro de téléphone").fill("+1 202 555 0100");
  await page.getByRole("button", { name: "Recevoir un code" }).click();
  await expect(page.locator(".erreur")).toContainText("pas pris en charge");
  await capture(page, "connexion-indicatif-non-autorise");

  // 2. Référent de Sciences : lien vers un chapitre de Mathématiques, décidé par lui seul.
  await creerInvitationFictive("TEST-DEMO-0006", ["sciences"]);
  await seConnecter(page, REFERENT);
  await page.goto("/referent/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif sciences");
  await page.getByLabel("Code d'invitation").fill("TEST-DEMO-0006");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await page.goto(
    `/referent/chapitres/${await idChapitre("ga-3e-physique-chimie", "electricite")}`,
  );
  await expect(page.getByText("Autre famille de matières").first()).toBeVisible();
  await capture(page, "referent-sciences-lien-vers-les-maths");

  // 3. Élève du pays Z : leçon écrite (pas encore de vidéo), puis questionnaire anonyme.
  await page.context().clearCookies();
  await seConnecter(page, ELEVE_Z);
  await page.getByLabel("Ton prénom ou un pseudonyme").fill("Élève fictif Z");
  await page.getByLabel("Pays et programme").selectOption({ value: "zz-general" });
  await page.getByLabel("Ta classe").selectOption({ label: "Année 3" });
  await page.getByLabel("J'ai 16 ans ou plus").check();
  await page.getByRole("button", { name: "M'inscrire" }).click();
  await expect(page).toHaveURL(/\/espace$/);
  await page.goto("/catalogue/zz-an3-mathematiques");
  await page.locator(".chapitres a").first().click();
  await expect(page.locator("details.lecon")).toContainText("Inconnue, équation");
  await capture(page, "eleve-lecon-ecrite-sans-video");
  await page.goto("/espace/questionnaire");
  await page.getByLabel("4 — Plutôt oui").check();
  await capture(page, "eleve-questionnaire-anonyme");
  await page.getByLabel("Option A").check();
  await page.getByRole("button", { name: "Envoyer mes réponses" }).click();
  await expect(page.getByRole("status")).toContainText("Merci");

  // 4. Mes données : déconnexion de tous les appareils (sessions révocables).
  await page.goto("/espace/mes-donnees");
  await capture(page, "mes-donnees-tous-mes-appareils");

  // 5. Administration : documents officiels, fermeture de toutes les sessions, pilotage avec les mesures.
  await executerSql(
    `insert into documents_officiels (referentiel_id, titre, origine, format, texte, empreinte)
     select id, 'Programme fictif de démonstration', 'Démonstration (fictif)', 'texte', 'Texte fictif', 'e'
     from referentiels where code = 'ga-general'`,
  );
  await creerAdministrateurFictif(ADMIN);
  await page.context().clearCookies();
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await page.getByRole("heading", { name: /Documents officiels/ }).scrollIntoViewIfNeeded();
  await capture(page, "administration-documents-et-sessions");
  await page.goto("/administration/exploitation");
  await expect(
    page.getByRole("heading", { name: "Visionnage par chapitre (30 jours)" }),
  ).toBeVisible();
  await capture(page, "administration-mesures-du-pilote");
});
