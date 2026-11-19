import { expect, test, type Page } from "@playwright/test";
import {
  creerAdministrateurFictif,
  executerSql,
  seConnecter,
  validerChapitresFictifs,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 13 : une semaine de pilote FICTIVE, sur téléphone simulé. Un critère de
// suspension atteint (détresse sans prise en charge), l'accès des élèves fermé puis rouvert avec les 4 points de la
// reprise, le journal du pilote, puis le rapport de la semaine (équipe et établissement).
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_13 ?? "../docs/demo/jalon-13";
let numero = 0;
async function capture(page: Page, nom: string, pleinePage = true) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: pleinePage,
  });
}

test.use({ locale: "fr-FR" });

const ADMIN = "+999 000 026 01";
const UNITE = "ga-3e-mathematiques";
const RESUME_DETRESSE = "Détresse fictive de la démonstration (aucun élève réel)";

test("parcours complet du Jalon 13", async ({ page }) => {
  test.setTimeout(240_000);
  await creerAdministrateurFictif(ADMIN);

  // Données FICTIVES : un chapitre du pilote validé avec son quiz ; 8 élèves fictifs, 6 actifs cette semaine,
  // 3 la semaine précédente ; des chapitres terminés, des vidéos vues, un coût ; une détresse ouverte depuis 13 h.
  await validerChapitresFictifs(UNITE, 1);
  await executerSql(
    `insert into chapitres_pilote (chapitre_id)
     select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 order by c.ordre limit 1
     on conflict do nothing`,
    [UNITE],
  );
  const [quiz] = await executerSql(
    `insert into quiz (chapitre_id, version, questions, cree_par)
     select c.id, 1, '[{"enonce": "Question fictive"}]'::jsonb, 'demonstration'
     from chapitres c join unites u on u.id = c.unite_id where u.code = $1 order by c.ordre limit 1
     returning id, chapitre_id`,
    [UNITE],
  );
  await executerSql("update quiz set statut = 'valide' where id = $1", [quiz.id]);
  await executerSql(
    `with nouveaux as (
       select gen_random_uuid() as id, i from generate_series(1, 8) i
     ), comptes as (
       insert into auth.users (id) select id from nouveaux returning id
     ), profils_crees as (
       insert into profils (id, role, prenom_ou_pseudo, cree_le)
       select id, 'eleve', 'Élève fictif de la semaine ' || i, now() - interval '20 days' from nouveaux returning id
     ), eleves_crees as (
       insert into eleves (id, referentiel_id, niveau_id, est_mineur, statut)
       select n.id, r.id, ni.id, true, 'actif' from nouveaux n, referentiels r, niveaux ni
       where r.code = 'ga-general' and ni.referentiel_id = r.id and ni.code = '3e' returning id
     ), tentatives as (
       insert into tentatives_quiz (quiz_id, eleve_id, reponses, score, corrige_le)
       select $1, n.id, '[]'::jsonb, 50 + 5 * n.i,
              case when n.i <= 6 then now() - (n.i % 3) * interval '1 day' else now() - interval '9 days' end
       from nouveaux n
     )
     insert into progression (eleve_id, chapitre_id, statut, maj_le)
     select n.id, $2, 'termine', now() - interval '2 days' from nouveaux n where n.i <= 5`,
    [quiz.id, quiz.chapitre_id],
  );
  await executerSql(
    `insert into visionnages_jour (chapitre_id, jour, videos_demarrees, videos_terminees, lecons_ouvertes)
     values ($1, current_date - 1, 9, 7, 4), ($1, current_date - 8, 3, 2, 1)
     on conflict (chapitre_id, jour) do update set videos_demarrees = excluded.videos_demarrees`,
    [quiz.chapitre_id],
  );
  await executerSql(
    `insert into consommation_agents (agent, jour, cout_usd) values
       ('professeur', current_date - 1, 1.85), ('evaluateur', current_date - 2, 0.65), ('professeur', current_date - 8, 0.9)
     on conflict (agent, jour) do update set cout_usd = excluded.cout_usd`,
  );
  await executerSql(
    `insert into signalements (source, motif, priorite, resume, cree_le)
     values ('agent_professeur', 'detresse', 1, $1, now() - interval '13 hours')`,
    [RESUME_DETRESSE],
  );

  // 1. Critères de suspension : la détresse sans prise en charge depuis plus de 12 h est « atteinte ».
  await seConnecter(page, ADMIN);
  await page.goto("/administration/criteres");
  await expect(page.getByText("1 critère atteint")).toBeVisible();
  await capture(page, "critere-atteint-detresse", false);

  // 2. Décision du propriétaire : fermer l'accès des élèves, critère en cause noté.
  await page.goto("/administration");
  await page
    .getByLabel("Motif (interne, jamais montré aux élèves)")
    .fill("Détresse sans prise en charge depuis 13 h (démonstration fictive)");
  await page.locator("#critere-acces").selectOption("detresse_hors_delai");
  await page.getByRole("button", { name: "Fermer l'accès des élèves" }).click();
  await expect(page.getByRole("status").first()).toContainText("fermé");
  await page.locator("#acces").scrollIntoViewIfNeeded();
  await capture(page, "acces-ferme-decision-notee", false);

  // 3. La détresse est prise en charge, puis reprise avec les 4 points.
  await executerSql("update signalements set traite_le = now() where resume = $1", [
    RESUME_DETRESSE,
  ]);
  await page.reload();
  await page.getByText("Rouvrir l'accès des élèves (reprise)", { exact: true }).click();
  const formulaire = page.locator("form").filter({
    has: page.getByRole("button", { name: "Rouvrir l'accès des élèves", exact: true }),
  });
  await formulaire
    .getByLabel("Cause identifiée")
    .fill("Alerte de veille non reçue : contact de veille mal saisi (fictif)");
  await formulaire
    .getByLabel(/Correction faite et testée/)
    .fill("Contact corrigé ; test d'alerte reçu sur le téléphone de l'équipe (fictif)");
  await formulaire.getByLabel(/accord écrit/).check();
  await formulaire.getByLabel(/établissement est informé/).check();
  await page.locator("#acces").scrollIntoViewIfNeeded();
  await capture(page, "reprise-quatre-points", false);
  await formulaire.getByRole("button", { name: "Rouvrir l'accès des élèves", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("rouvert");

  // 4. Point hebdomadaire, puis le journal du pilote.
  await page.goto("/administration/journal");
  await page.getByText("Ajouter un point hebdomadaire ou une note").click();
  await page
    .getByLabel(/^Texte/)
    .fill(
      "Point fictif de la semaine : incident de veille clos ; 6 élèves actifs ; seuils et budget à valider.",
    );
  await page.getByRole("button", { name: "Ajouter au journal" }).click();
  await expect(page.getByRole("status")).toContainText("Entrée ajoutée");
  await capture(page, "journal-du-pilote");

  // 5. Rapport de la semaine : version équipe, puis version établissement.
  await page.goto("/administration/semaine");
  await expect(page.getByText("version équipe")).toBeVisible();
  await capture(page, "semaine-version-equipe");
  await page.goto("/administration/semaine?version=etablissement");
  await expect(page.getByText("version pour l'établissement")).toBeVisible();
  await capture(page, "semaine-version-etablissement");
});
